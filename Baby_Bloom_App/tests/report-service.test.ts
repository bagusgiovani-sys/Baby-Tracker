import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReport, ReportError } from '../src/server/report-service.ts';
const babyId = '60000000-0000-4000-8000-000000000001';
const actor = '60000000-0000-4000-8000-000000000002';
const input = { babyId, days: 7, endDay: '2026-03-10', consent: true };
function fixture({
  authorized = true,
  quota = true,
  output = ['review_sources', 'sparse_days'],
  key = true,
} = {}) {
  const calls: { url: string; body: unknown; authorization: string | null }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const value = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({
      url: value,
      body,
      authorization: new Headers(init?.headers).get('Authorization'),
    });
    let result: unknown;
    if (value.includes('/auth/v1/user')) result = { id: actor };
    else if (value.endsWith('/rpc/list_babies'))
      result = authorized
        ? [
            {
              id: babyId,
              nickname: 'PRIVATE NAME',
              date_of_birth: '2026-01-01',
              timezone: 'Asia/Jakarta',
              gestation_weeks: null,
              gestation_days: null,
              role: 'owner',
              growth_reference_sex: null,
            },
          ]
        : [];
    else if (value.endsWith('/rpc/list_events')) result = [];
    else if (value.endsWith('/rpc/claim_report_request')) result = quota;
    else if (value === 'https://api.openai.com/v1/responses')
      result = {
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify({ insights: output }) }],
          },
        ],
      };
    else throw new Error('Unexpected fixture request');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return {
    calls,
    options: {
      url: 'https://synthetic.supabase.co',
      publicKey: 'synthetic-public',
      apiKey: key ? 'synthetic-server-key' : undefined,
      fetcher,
      now: new Date('2026-03-10T12:00:00Z'),
    },
  };
}
test('AI server verifies auth and caregiver access before making a provider request', async () => {
  const f = fixture({ authorized: false });
  await assert.rejects(
    generateReport(input, 'synthetic-session', f.options),
    (e: unknown) => e instanceof ReportError && e.status === 403,
  );
  assert.equal(
    f.calls.some((c) => c.url.includes('api.openai.com')),
    false,
  );
  await assert.rejects(
    generateReport(input, '', f.options),
    (e: unknown) => e instanceof ReportError && e.status === 401,
  );
  await assert.rejects(
    generateReport({ ...input, serviceRole: 'bad' }, 'synthetic-session', f.options),
    (e: unknown) => e instanceof ReportError && e.status === 400,
  );
});
test('missing provider key and persistent quota return clear errors without paid calls', async () => {
  for (const [options, code] of [
    [{ key: false }, 'ai_not_configured'],
    [{ quota: false }, 'ai_rate_limited'],
  ] as const) {
    const f = fixture(options);
    await assert.rejects(
      generateReport(input, 'synthetic-session', f.options),
      (e: unknown) => e instanceof ReportError && e.message === code,
    );
    assert.equal(
      f.calls.some((c) => c.url.includes('api.openai.com')),
      false,
    );
  }
});
test('provider receives only aggregate facts with store:false; response contains only eligible reviewed codes', async () => {
  const f = fixture();
  const result = await generateReport(input, 'synthetic-session', f.options);
  assert.deepEqual(result.insights, ['review_sources', 'sparse_days']);
  const call = f.calls.find((c) => c.url.includes('api.openai.com'))!;
  const body = call.body as { store: boolean; input: string };
  assert.equal(body.store, false);
  for (const token of [babyId, actor, 'PRIVATE NAME', '2026-01-01', 'synthetic-session'])
    assert.ok(!body.input.includes(token));
  assert.equal(call.authorization, 'Bearer synthetic-server-key');
  const bad = fixture({ output: ['prescribe_iron'] });
  await assert.rejects(generateReport(input, 'synthetic-session', bad.options), /ai_unavailable/);
});
