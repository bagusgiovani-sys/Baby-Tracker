import { payloadCipher } from './payload-cipher.ts';
let opening: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('babybloom-keystore', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('keys'))
        request.result.createObjectStore('keys');
      if (!request.result.objectStoreNames.contains('secrets'))
        request.result.createObjectStore('secrets');
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        opening = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      opening = undefined;
      reject(new Error('storage_error'));
    };
  });
  return opening;
}
export async function browserKey(purpose: 'local-v1' | 'auth-v1'): Promise<CryptoKey> {
  const db = await database();
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = db.transaction('keys', 'readonly').objectStore('keys').get(purpose);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('storage_error'));
  });
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const request = store.get(purpose);
    let chosen = key;
    request.onsuccess = () => {
      chosen = request.result ?? key;
      if (!request.result) store.put(key, purpose);
    };
    tx.oncomplete = () => resolve(chosen);
    tx.onerror = () => reject(new Error('storage_error'));
  });
}
export const browserSessionStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await database();
    const value = await new Promise<string | undefined>((resolve, reject) => {
      const request = db.transaction('secrets', 'readonly').objectStore('secrets').get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('storage_error'));
    });
    return value ? payloadCipher(await browserKey('auth-v1')).decrypt(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const ciphertext = await payloadCipher(await browserKey('auth-v1')).encrypt(value);
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('secrets', 'readwrite');
      tx.objectStore('secrets').put(ciphertext, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('storage_error'));
    });
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('secrets', 'readwrite');
      tx.objectStore('secrets').delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('storage_error'));
    });
  },
};
