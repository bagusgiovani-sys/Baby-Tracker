import * as SQLite from 'expo-sqlite';
import type { SqlDriver } from './repository';
import { sqliteDriver } from './sqlite-driver';
import { browserKey } from './browser-vault';
import { payloadCipher } from './payload-cipher';
let opening: Promise<SqlDriver> | undefined;
export function openLocal(): Promise<SqlDriver> {
  opening ??= (async () => {
    if (!globalThis.crossOriginIsolated || !globalThis.crypto?.subtle || !navigator.locks)
      throw new Error('storage_error');
    const key = await browserKey('local-v1');
    const db = await SQLite.openDatabaseAsync('babybloom-web.db');
    return sqliteDriver(
      db,
      payloadCipher(key),
      async (work) => await navigator.locks.request('babybloom-storage', work),
    );
  })();
  return opening;
}
