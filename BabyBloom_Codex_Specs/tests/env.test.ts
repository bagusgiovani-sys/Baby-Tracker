import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environmentSchema } from '../src/lib/env.ts';
test('client accepts publishable/anon keys and rejects server secrets and insecure remote URLs', () => {
    const key = 'sb_publishable_synthetic_example_only';
    assert.equal(environmentSchema.safeParse({ url: 'https://example.supabase.co', key }).success, true);
    assert.equal(environmentSchema.safeParse({ url: 'http://10.0.2.2:54321', key }).success, true);
    for (const url of ['', 'not-a-url', 'http://example.com', 'http://localhost.evil.example'])
        assert.equal(environmentSchema.safeParse({ url, key }).success, false);
    assert.equal(environmentSchema.safeParse({ url: 'https://example.supabase.co', key: 'sb_secret_synthetic_example_only' }).success, false);
    const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.synthetic`;
    assert.equal(environmentSchema.safeParse({ url: 'https://example.supabase.co', key: jwt('service_role') }).success, false);
    assert.equal(environmentSchema.safeParse({ url: 'https://example.supabase.co', key: jwt('anon') }).success, true);
});
