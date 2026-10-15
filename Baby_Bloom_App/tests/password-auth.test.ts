import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

test('installed Supabase SDK carries recovery intent through PKCE exchange to password form', async () => {
  const values = new Map<string, string>();
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const client = createClient('https://synthetic.supabase.co', 'synthetic-public-key', {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'password-test',
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      },
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const body = JSON.parse(String(init?.body ?? '{}'));
        requests.push({ path: url.pathname, body });
        if (url.pathname.endsWith('/recover')) return Response.json({});
        assert.equal(url.searchParams.get('grant_type'), 'pkce');
        assert.equal(body.auth_code, 'synthetic-code');
        assert.ok(typeof body.code_verifier === 'string' && body.code_verifier.length > 20);
        return Response.json({
          access_token: 'synthetic-access',
          refresh_token: 'synthetic-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'synthetic-user', aud: 'authenticated', role: 'authenticated' },
        });
      },
    },
  });
  const reset = await client.auth.resetPasswordForEmail('synthetic@example.com', {
    redirectTo: 'https://app.example/auth/callback',
  });
  assert.equal(reset.error, null);
  const result = await client.auth.exchangeCodeForSession('synthetic-code');
  assert.equal(result.error, null);
  assert.ok(result.data.session);
  assert.ok('redirectType' in result.data && result.data.redirectType === 'PASSWORD_RECOVERY');
  assert.equal(requests.length, 2);
  assert.equal(values.has('password-test-code-verifier'), false);
  client.auth.stopAutoRefresh();
});
