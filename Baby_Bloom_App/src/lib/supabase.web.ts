import { createClient } from '@supabase/supabase-js';
import { environment } from './env';
import type { Database } from './database';
import { browserSessionStorage } from '../data/local/browser-vault';
// Persist only authenticated ciphertext; browser keys are non-extractable.
// Origin isolation still requires an XSS review before release.
export const supabase = environment.success
  ? createClient<Database>(environment.data.url, environment.data.key, {
      auth: {
        storage: browserSessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
