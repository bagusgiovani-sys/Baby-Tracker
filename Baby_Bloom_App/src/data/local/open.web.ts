import * as SQLite from 'expo-sqlite';
import type { SqlDriver } from './repository';
import { sqliteDriver } from './sqlite-driver';
import { browserKey } from './browser-vault';
import { payloadCipher } from './payload-cipher';
let opening: Promise<SqlDriver> | undefined;
export function openLocal(): Promise<SqlDriver> {
  opening ??= (async () => {
    if (!globalThis.crossOriginIsolated) throw new Error('storage_browser_required');
    if (!globalThis.crypto?.subtle || !navigator.locks)
      throw new Error('storage_browser_unsupported');
    return new Promise<SqlDriver>((resolve, reject) => {
      // OPFS access handles are exclusive for the worker's lifetime. Claim the
      // connection before starting SQLite so another tab cannot poison its VFS.
      void navigator.locks
        .request('babybloom-storage-owner', { ifAvailable: true }, async (lock) => {
          if (!lock) {
            reject(new Error('storage_in_use'));
            return;
          }
          try {
            const key = await browserKey('local-v1');
            const db = await SQLite.openDatabaseAsync('babybloom-web.db').catch(
              (error: unknown) => {
                const message = error instanceof Error ? error.message : '';
                if (/NoModificationAllowed|access.*handle|locked|already.*open/i.test(message))
                  throw new Error('storage_in_use');
                throw new Error('storage_database_unavailable');
              },
            );
            resolve(
              sqliteDriver(
                db,
                payloadCipher(key),
                async (work) => await navigator.locks.request('babybloom-storage', work),
              ),
            );
            // The browser releases this lease when the document is destroyed.
            await new Promise<void>(() => {});
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  })().catch((error) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
