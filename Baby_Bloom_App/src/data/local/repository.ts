import type { Baby, CareEvent, SavedEvent, SyncStatus } from '../../domain/events.ts';
export type SqlValue = string | number | null;
export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: SqlValue[]): Promise<void>;
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  transaction<T>(work: (tx: SqlDriver) => Promise<T>): Promise<T>;
}
export type Mutation = {
  mutation_id: string;
  owner_id: string;
  event_id: string;
  baby_id: string;
  operation: 'create' | 'update' | 'delete';
  expected_version: number;
  payload: CareEvent;
  future_confirmed: boolean;
  attempts: number;
  next_attempt: number;
  status: SyncStatus;
  sequence: number;
  error_code: string | null;
};
type QueueRow = Omit<Mutation, 'payload' | 'future_confirmed'> & {
  payload: string;
  future_confirmed: number;
};
export const localSchema = `
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS babies(owner_id TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner_id,id));
  CREATE TABLE IF NOT EXISTS events(owner_id TEXT NOT NULL,id TEXT NOT NULL,baby_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner_id,id));
  CREATE INDEX IF NOT EXISTS local_baby_events ON events(owner_id,baby_id);
  CREATE TABLE IF NOT EXISTS queue(sequence INTEGER PRIMARY KEY AUTOINCREMENT,mutation_id TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL,event_id TEXT NOT NULL,baby_id TEXT NOT NULL,operation TEXT NOT NULL,expected_version INTEGER NOT NULL,payload TEXT NOT NULL,future_confirmed INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'queued',error_code TEXT);
  CREATE INDEX IF NOT EXISTS local_queue_owner ON queue(owner_id,sequence);
  CREATE TABLE IF NOT EXISTS conflicts(owner_id TEXT NOT NULL,event_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner_id,event_id));
  CREATE TABLE IF NOT EXISTS sync_cursors(owner_id TEXT NOT NULL,baby_id TEXT NOT NULL,cursor TEXT NOT NULL,PRIMARY KEY(owner_id,baby_id));
`;
const unpack = (row: QueueRow): Mutation => ({
  ...row,
  payload: JSON.parse(row.payload),
  future_confirmed: !!row.future_confirmed,
});
export class LocalRepository {
  private db: SqlDriver;
  readonly ownerId: string;
  constructor(db: SqlDriver, ownerId: string) {
    this.db = db;
    this.ownerId = ownerId;
  }
  async initialize() {
    await this.db.exec(localSchema);
    if (
      !(
        await this.db.all<{
          name: string;
        }>('PRAGMA table_info(queue)')
      ).some((column) => column.name === 'error_code')
    )
      await this.db.exec('ALTER TABLE queue ADD COLUMN error_code TEXT');
    await this.db.run(
      "UPDATE queue SET status='queued' WHERE owner_id=? AND status='syncing'",
      this.ownerId,
    );
    const events = await this.db.all<{
      id: string;
      payload: string;
    }>('SELECT id,payload FROM events WHERE owner_id=?', this.ownerId);
    for (const row of events) {
      const event: SavedEvent = JSON.parse(row.payload);
      if (event.sync_status === 'syncing') await this.put({ ...event, sync_status: 'queued' });
    }
  }
  private async put(event: SavedEvent, tx = this.db) {
    await tx.run(
      'INSERT INTO events(owner_id,id,baby_id,payload) VALUES(?,?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET payload=excluded.payload,baby_id=excluded.baby_id',
      this.ownerId,
      event.id,
      event.baby_id,
      JSON.stringify(event),
    );
  }
  async babies(): Promise<Baby[]> {
    return (
      await this.db.all<{
        payload: string;
      }>('SELECT payload FROM babies WHERE owner_id=? ORDER BY id', this.ownerId)
    ).map((r) => JSON.parse(r.payload));
  }
  async setBabies(babies: Baby[]) {
    await this.db.transaction(async (tx) => {
      const previous = await tx.all<{
        id: string;
      }>('SELECT id FROM babies WHERE owner_id=?', this.ownerId);
      for (const row of previous)
        if (!babies.some((b) => b.id === row.id)) {
          await tx.run('DELETE FROM events WHERE owner_id=? AND baby_id=?', this.ownerId, row.id);
          await tx.run('DELETE FROM queue WHERE owner_id=? AND baby_id=?', this.ownerId, row.id);
          await tx.run(
            'DELETE FROM sync_cursors WHERE owner_id=? AND baby_id=?',
            this.ownerId,
            row.id,
          );
          await tx.run(
            'DELETE FROM conflicts WHERE owner_id=? AND event_id NOT IN(SELECT id FROM events WHERE owner_id=?)',
            this.ownerId,
            this.ownerId,
          );
        }
      await tx.run('DELETE FROM babies WHERE owner_id=?', this.ownerId);
      for (const baby of babies)
        await tx.run(
          'INSERT INTO babies VALUES(?,?,?)',
          this.ownerId,
          baby.id,
          JSON.stringify(baby),
        );
    });
  }
  async events(babyId: string): Promise<SavedEvent[]> {
    return (
      await this.db.all<{
        payload: string;
      }>('SELECT payload FROM events WHERE owner_id=? AND baby_id=?', this.ownerId, babyId)
    ).map((r) => JSON.parse(r.payload));
  }
  async save(
    event: CareEvent,
    mutationId: string,
    operation: Mutation['operation'],
    futureConfirmed: boolean,
    now: Date,
    baselineVersion?: number,
  ) {
    await this.db.transaction(async (tx) => {
      const babyRow = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM babies WHERE owner_id=? AND id=?', this.ownerId, event.baby_id)
      )[0];
      if (!babyRow || (JSON.parse(babyRow.payload) as Baby).role === 'viewer')
        throw new Error('unauthorized');
      const row = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM events WHERE owner_id=? AND id=?', this.ownerId, event.id)
      )[0];
      const previous: SavedEvent | undefined = row ? JSON.parse(row.payload) : undefined;
      if (
        previous &&
        (previous.baby_id !== event.baby_id ||
          previous.event_type !== event.event_type ||
          previous.deleted_at)
      )
        throw new Error('invalid');
      if (previous?.sync_status === 'conflict') throw new Error('conflict');
      if (operation !== 'create' && !previous) throw new Error('invalid');
      if (operation === 'create' && previous) throw new Error('invalid');
      const rejected = (
        await tx.all<QueueRow>(
          'SELECT * FROM queue WHERE owner_id=? AND event_id=? ORDER BY sequence LIMIT 1',
          this.ownerId,
          event.id,
        )
      )[0];
      let effectiveOperation = operation;
      let expectedVersion = baselineVersion ?? previous?.server_version ?? 0;
      // A definitive rejection has no receipt. Replace it with a new mutation ID
      // after the user repairs the form; ambiguous network failures stay intact.
      if (rejected?.status === 'error' && rejected.next_attempt === 0) {
        if (rejected.operation === 'create' && operation === 'delete') {
          await tx.run('DELETE FROM queue WHERE owner_id=? AND event_id=?', this.ownerId, event.id);
          await tx.run('DELETE FROM events WHERE owner_id=? AND id=?', this.ownerId, event.id);
          return;
        }
        effectiveOperation = rejected.operation === 'create' ? 'create' : operation;
        expectedVersion = rejected.expected_version;
        await tx.run('DELETE FROM queue WHERE owner_id=? AND event_id=?', this.ownerId, event.id);
      }
      if (event.event_type === 'sleep' && !event.ended_at && operation !== 'delete') {
        const active = (
          await tx.all<{
            id: string;
            payload: string;
          }>(
            'SELECT id,payload FROM events WHERE owner_id=? AND baby_id=?',
            this.ownerId,
            event.baby_id,
          )
        ).some((r) => {
          const e: SavedEvent = JSON.parse(r.payload);
          return e.id !== event.id && !e.deleted_at && e.event_type === 'sleep' && !e.ended_at;
        });
        if (active) throw new Error('active_sleep_conflict');
      }
      const saved: SavedEvent = {
        ...event,
        recorded_by: previous?.recorded_by ?? this.ownerId,
        server_version: previous?.server_version ?? 0,
        sync_status: 'queued',
        deleted_at: operation === 'delete' ? now.toISOString() : null,
      };
      await this.put(saved, tx);
      await tx.run(
        'INSERT INTO queue(mutation_id,owner_id,event_id,baby_id,operation,expected_version,payload,future_confirmed) VALUES(?,?,?,?,?,?,?,?)',
        mutationId,
        this.ownerId,
        event.id,
        event.baby_id,
        effectiveOperation,
        expectedVersion,
        JSON.stringify(event),
        futureConfirmed ? 1 : 0,
      );
    });
  }
  async pending(): Promise<Mutation[]> {
    return (
      await this.db.all<QueueRow>(
        'SELECT * FROM queue WHERE owner_id=? ORDER BY sequence',
        this.ownerId,
      )
    ).map(unpack);
  }
  async status(
    mutation: Mutation,
    status: SyncStatus,
    nextAttempt = 0,
    errorCode: string | null = null,
  ) {
    await this.db.transaction(async (tx) => {
      if (
        !(
          await tx.all(
            'SELECT mutation_id FROM queue WHERE owner_id=? AND mutation_id=?',
            this.ownerId,
            mutation.mutation_id,
          )
        ).length
      )
        return;
      await tx.run(
        'UPDATE queue SET status=?,attempts=attempts+?,next_attempt=?,error_code=? WHERE owner_id=? AND mutation_id=?',
        status,
        status === 'error' ? 1 : 0,
        nextAttempt,
        errorCode,
        this.ownerId,
        mutation.mutation_id,
      );
      const row = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM events WHERE owner_id=? AND id=?', this.ownerId, mutation.event_id)
      )[0];
      if (row) await this.put({ ...JSON.parse(row.payload), sync_status: status }, tx);
    });
  }
  async acknowledge(
    mutation: Mutation,
    server: SavedEvent,
    acceptedVersion = server.server_version,
  ) {
    await this.db.transaction(async (tx) => {
      if (
        !(
          await tx.all(
            'SELECT mutation_id FROM queue WHERE owner_id=? AND mutation_id=?',
            this.ownerId,
            mutation.mutation_id,
          )
        ).length
      )
        return;
      await tx.run(
        'DELETE FROM queue WHERE owner_id=? AND mutation_id=?',
        this.ownerId,
        mutation.mutation_id,
      );
      const next = (
        await tx.all<QueueRow>(
          'SELECT * FROM queue WHERE owner_id=? AND event_id=? ORDER BY sequence LIMIT 1',
          this.ownerId,
          mutation.event_id,
        )
      )[0];
      if (next && server.deleted_at) {
        await tx.run(
          "UPDATE queue SET status='conflict' WHERE owner_id=? AND event_id=?",
          this.ownerId,
          mutation.event_id,
        );
        await tx.run(
          'INSERT INTO conflicts VALUES(?,?,?) ON CONFLICT(owner_id,event_id) DO UPDATE SET payload=excluded.payload',
          this.ownerId,
          mutation.event_id,
          JSON.stringify(server),
        );
        const row = (
          await tx.all<{
            payload: string;
          }>(
            'SELECT payload FROM events WHERE owner_id=? AND id=?',
            this.ownerId,
            mutation.event_id,
          )
        )[0]!;
        await this.put({ ...JSON.parse(row.payload), sync_status: 'conflict' }, tx);
        return;
      }
      if (next && !server.deleted_at) {
        await tx.run(
          'UPDATE queue SET expected_version=? WHERE owner_id=? AND mutation_id=?',
          acceptedVersion,
          this.ownerId,
          next.mutation_id,
        );
        const row = (
          await tx.all<{
            payload: string;
          }>(
            'SELECT payload FROM events WHERE owner_id=? AND id=?',
            this.ownerId,
            mutation.event_id,
          )
        )[0]!;
        await this.put(
          { ...JSON.parse(row.payload), server_version: acceptedVersion, sync_status: 'queued' },
          tx,
        );
      } else {
        await this.put(server, tx);
        if (server.deleted_at)
          await tx.run(
            'DELETE FROM queue WHERE owner_id=? AND event_id=?',
            this.ownerId,
            mutation.event_id,
          );
      }
    });
  }
  async conflict(mutation: Mutation, current: SavedEvent) {
    await this.db.transaction(async (tx) => {
      await tx.run(
        "UPDATE queue SET status='conflict' WHERE owner_id=? AND event_id=?",
        this.ownerId,
        mutation.event_id,
      );
      await tx.run(
        'INSERT INTO conflicts VALUES(?,?,?) ON CONFLICT(owner_id,event_id) DO UPDATE SET payload=excluded.payload',
        this.ownerId,
        mutation.event_id,
        JSON.stringify(current),
      );
      const row = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM events WHERE owner_id=? AND id=?', this.ownerId, mutation.event_id)
      )[0];
      if (row) await this.put({ ...JSON.parse(row.payload), sync_status: 'conflict' }, tx);
    });
  }
  async serverConflict(eventId: string): Promise<SavedEvent | null> {
    const row = (
      await this.db.all<{
        payload: string;
      }>('SELECT payload FROM conflicts WHERE owner_id=? AND event_id=?', this.ownerId, eventId)
    )[0];
    return row ? JSON.parse(row.payload) : null;
  }
  async resolve(eventId: string, choice: 'server' | 'mine', mutationId: string) {
    await this.db.transaction(async (tx) => {
      const conflictRow = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM conflicts WHERE owner_id=? AND event_id=?', this.ownerId, eventId)
      )[0];
      const server: SavedEvent | null = conflictRow ? JSON.parse(conflictRow.payload) : null;
      const row = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM events WHERE owner_id=? AND id=?', this.ownerId, eventId)
      )[0];
      if (!server || !row) throw new Error('invalid');
      const mine: SavedEvent = JSON.parse(row.payload);
      if (choice === 'mine' && server.deleted_at) throw new Error('deleted_on_server');
      const deleted = !!mine.deleted_at;
      await tx.run('DELETE FROM queue WHERE owner_id=? AND event_id=?', this.ownerId, eventId);
      await tx.run('DELETE FROM conflicts WHERE owner_id=? AND event_id=?', this.ownerId, eventId);
      if (choice === 'server') await this.put(server, tx);
      else {
        const {
          recorded_by: _r,
          server_version: _v,
          deleted_at: _d,
          sync_status: _s,
          ...payload
        } = mine;
        await this.put(
          { ...mine, server_version: server.server_version, sync_status: 'queued' },
          tx,
        );
        await tx.run(
          'INSERT INTO queue(mutation_id,owner_id,event_id,baby_id,operation,expected_version,payload,future_confirmed) VALUES(?,?,?,?,?,?,?,1)',
          mutationId,
          this.ownerId,
          eventId,
          mine.baby_id,
          deleted ? 'delete' : 'update',
          server.server_version,
          JSON.stringify(payload),
        );
      }
    });
  }
  async merge(server: SavedEvent) {
    await this.db.transaction(async (tx) => {
      const pending = await tx.all<{
        mutation_id: string;
      }>('SELECT mutation_id FROM queue WHERE owner_id=? AND event_id=?', this.ownerId, server.id);
      const row = (
        await tx.all<{
          payload: string;
        }>('SELECT payload FROM events WHERE owner_id=? AND id=?', this.ownerId, server.id)
      )[0];
      const previous: SavedEvent | null = row ? JSON.parse(row.payload) : null;
      if (!pending.length && (!previous || server.server_version >= previous.server_version))
        await this.put(server, tx);
    });
  }
  async retry() {
    await this.db.run(
      "UPDATE queue SET status='queued',next_attempt=0 WHERE owner_id=? AND status IN ('error','offline')",
      this.ownerId,
    );
  }
  async pullCursor(babyId: string): Promise<string | null> {
    return (
      (
        await this.db.all<{
          cursor: string;
        }>('SELECT cursor FROM sync_cursors WHERE owner_id=? AND baby_id=?', this.ownerId, babyId)
      )[0]?.cursor ?? null
    );
  }
  async setPullCursor(babyId: string, cursor: string) {
    await this.db.run(
      'INSERT INTO sync_cursors VALUES(?,?,?) ON CONFLICT(owner_id,baby_id) DO UPDATE SET cursor=excluded.cursor',
      this.ownerId,
      babyId,
      cursor,
    );
  }
  async purgeBaby(babyId: string) {
    const allowed = (await this.babies()).filter((b) => b.id !== babyId);
    await this.setBabies(allowed);
  }
}
