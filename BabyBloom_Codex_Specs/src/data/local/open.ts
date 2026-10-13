import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { SqlDriver } from './repository';
import { sqliteDriver } from './sqlite-driver';
let opening: Promise<SqlDriver> | undefined;
export function openLocal(): Promise<SqlDriver> {
    opening ??= (async () => {
        let key = await SecureStore.getItemAsync('babybloom.database.key');
        if (!key) {
            key = Array.from(await Crypto.getRandomBytesAsync(32)).map(b => b.toString(16).padStart(2, '0')).join('');
            await SecureStore.setItemAsync('babybloom.database.key', key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        }
        if (!/^[a-f0-9]{64}$/.test(key))
            throw new Error('storage_error');
        const db = await SQLite.openDatabaseAsync('babybloom.db');
        await db.execAsync(`PRAGMA key="x'${key}'"; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`);
        const cipher = await db.getFirstAsync<{
            cipher_version: string;
        }>('PRAGMA cipher_version');
        if (!cipher?.cipher_version) {
            await db.closeAsync();
            throw new Error('encrypted_build_required');
        }
        return sqliteDriver(db);
    })();
    return opening;
}
