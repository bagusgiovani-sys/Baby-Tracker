import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { environment } from './env';
import type { Database } from './database';
let tail: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = tail.then(operation, operation);
  tail = result.catch(() => undefined);
  return result;
}
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
// SecureStore item limits: split the complete auth session into bounded chunks.
const storage = {
  getItem: (key: string) =>
    serialized(async () => {
      const count = Number(await SecureStore.getItemAsync(key + '.count'));
      if (!count || count > 100) return null;
      let result = '';
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(key + '.' + i);
        if (part === null) return null;
        result += part;
      }
      return result;
    }),
  setItem: (key: string, value: string) =>
    serialized(async () => {
      const previous = Number(await SecureStore.getItemAsync(key + '.count')) || 0;
      const chunks = Math.ceil(value.length / 900);
      await SecureStore.deleteItemAsync(key + '.count');
      for (let i = 0; i < chunks; i++)
        await SecureStore.setItemAsync(key + '.' + i, value.slice(i * 900, (i + 1) * 900), options);
      for (let i = chunks; i < previous; i++) await SecureStore.deleteItemAsync(key + '.' + i);
      await SecureStore.setItemAsync(key + '.count', String(chunks), options);
    }),
  removeItem: (key: string) =>
    serialized(async () => {
      const count = Number(await SecureStore.getItemAsync(key + '.count')) || 0;
      await SecureStore.deleteItemAsync(key + '.count');
      for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(key + '.' + i);
    }),
};
export const supabase = environment.success
  ? createClient<Database>(environment.data.url, environment.data.key, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
