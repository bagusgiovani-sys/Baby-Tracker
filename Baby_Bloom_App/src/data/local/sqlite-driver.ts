import type { SqlDriver, SqlValue } from './repository.ts';
export interface SqliteConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  withTransactionAsync(work: () => Promise<void>): Promise<void>;
}
export type Exclusive = <T>(work: () => Promise<T>) => Promise<T>;
export type PayloadCipher = {
  encrypt: (value: string) => Promise<string>;
  decrypt: (value: string) => Promise<string>;
};
export function sqliteDriver(
  connection: SqliteConnection,
  cipher?: PayloadCipher,
  crossContextLock?: Exclusive,
): SqlDriver {
  let serial: Promise<unknown> = Promise.resolve();
  const exclusive: Exclusive = (work) => {
    const run = () => (crossContextLock ? crossContextLock(work) : work());
    const result = serial.then(run, run);
    serial = result.catch(() => undefined);
    return result;
  };
  const inside: SqlDriver = {
    exec: (query) => connection.execAsync(query),
    run: async (query, ...params) => {
      const encoded = await Promise.all(
        params.map((value) =>
          cipher && typeof value === 'string' && value.startsWith('{')
            ? cipher.encrypt(value)
            : value,
        ),
      );
      await connection.runAsync(query, ...encoded);
    },
    all: async <T>(query: string, ...params: SqlValue[]) => {
      const rows = await connection.getAllAsync<Record<string, unknown>>(query, ...params);
      if (cipher)
        for (const row of rows)
          if (typeof row.payload === 'string') row.payload = await cipher.decrypt(row.payload);
      return rows as T[];
    },
    transaction: (work) => work(inside),
  };
  return {
    exec: (query) => exclusive(() => inside.exec(query)),
    run: (query, ...params) => exclusive(() => inside.run(query, ...params)),
    all: <T>(query: string, ...params: SqlValue[]) =>
      exclusive(() => inside.all<T>(query, ...params)),
    transaction: <T>(work: (tx: SqlDriver) => Promise<T>) =>
      exclusive(async () => {
        let result!: T;
        // Keep transactions on the keyed SQLCipher connection. A new connection
        // would need its own key before it could read the encrypted database.
        await connection.withTransactionAsync(async () => {
          result = await work(inside);
        });
        return result;
      }),
  };
}
