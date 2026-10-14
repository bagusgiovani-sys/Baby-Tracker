import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReport, ReportError } from '../src/server/report-service.ts';
const babyId = '60000000-0000-4000-8000-000000000001';
const actor = '60000000-0000-4000-8000-000000000002';
const providerUrl = 'https://api.groq.com/openai/v1/chat/completions';
const input = { babyId, days: 7, endDay: '2026-03-10', consent: true };
type FixtureOptions = {
  authorized?: boolean;
  quota?: boolean;
  output?: unknown;
  key?: boolean;
  providerStatus?: number;
  providerBody?: unknown;
  providerFailure?: boolean;
  rows?: Record<string, unknown>[];
};
function fixture({
  authorized = true,
  quota = true,
  output = ['review_sources', 'sparse_days'],
  key = true,
  providerStatus = 200,
  providerBody,
  providerFailure = false,
  rows = [],
}: FixtureOptions = {}) {
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
    else if (value.endsWith('/rpc/list_events')) result = rows;
    else if (value.endsWith('/rpc/claim_report_request')) result = quota;
    else if (value === providerUrl) {
      if (providerFailure) throw new Error('Synthetic provider failure with sensitive content');
      result = providerBody ?? {
        choices: [
          {
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify({ insights: output }) },
          },
        ],
      };
    } else throw new Error('Unexpected fixture request');
    return new Response(JSON.stringify(result), {
      status: value === providerUrl ? providerStatus : 200,
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
    f.calls.some((c) => c.url === providerUrl),
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
test('missing provider key and persistent quota return clear errors without provider calls', async () => {
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
      f.calls.some((c) => c.url === providerUrl),
      false,
    );
  }
});
test('Groq receives aggregate facts and strict JSON schema; response contains only eligible reviewed codes', async () => {
  const f = fixture();
  const result = await generateReport(input, 'synthetic-session', f.options);
  assert.deepEqual(result.insights, ['review_sources', 'sparse_days']);
  const call = f.calls.find((c) => c.url === providerUrl)!;
  const body = call.body as {
    model: string;
    messages: { content: string }[];
    response_format: { json_schema: { strict: boolean } };
    max_completion_tokens: number;
    include_reasoning: boolean;
  };
  assert.equal(body.model, 'openai/gpt-oss-120b');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.max_completion_tokens, 2048);
  assert.equal(body.include_reasoning, false);
  assert.equal('store' in body, false); // Unsupported on Groq's Chat API.
  const facts = body.messages[1]!.content;
  for (const token of [babyId, actor, 'PRIVATE NAME', '2026-01-01', 'synthetic-session'])
    assert.ok(!facts.includes(token));
  assert.equal(call.authorization, 'Bearer synthetic-server-key');
  const bad = fixture({ output: ['prescribe_iron'] });
  await assert.rejects(generateReport(input, 'synthetic-session', bad.options), /ai_unavailable/);
});

test('consent, date validation and configured backend are required before provider use', async () => {
  const f = fixture();
  for (const invalid of [
    { ...input, consent: false },
    { ...input, endDay: '2026-03-11' },
  ]) {
    await assert.rejects(
      generateReport(invalid, 'synthetic-session', f.options),
      (e: unknown) => e instanceof ReportError && e.status === 400,
    );
  }
  await assert.rejects(
    generateReport(input, 'synthetic-session', { ...f.options, url: undefined }),
    (e: unknown) => e instanceof ReportError && e.status === 503,
  );
  assert.equal(
    f.calls.some((c) => c.url === providerUrl),
    false,
  );
});

test('free-tier exhaustion and invalid keys produce bounded errors without retries or another provider', async () => {
  for (const [providerStatus, status, message] of [
    [429, 429, 'ai_provider_rate_limited'],
    [401, 503, 'ai_not_configured'],
    [403, 503, 'ai_not_configured'],
    [500, 502, 'ai_unavailable'],
  ] as const) {
    const f = fixture({ providerStatus, providerBody: { error: 'Synthetic sensitive error' } });
    await assert.rejects(
      generateReport(input, 'synthetic-session', f.options),
      (e: unknown) => e instanceof ReportError && e.status === status && e.message === message,
    );
    assert.equal(f.calls.filter((c) => c.url === providerUrl).length, 1);
    assert.equal(
      f.calls.some((c) => c.url.includes('api.openai.com')),
      false,
    );
  }
});

test('provider failures, refusals, truncated output and invalid JSON never become insights', async () => {
  const message = { content: JSON.stringify({ insights: ['sparse_days'] }) };
  const badBodies = [
    {},
    { choices: [] },
    { choices: [{ finish_reason: 'length', message }] },
    { choices: [{ finish_reason: 'stop', message: { ...message, refusal: 'refused' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'invalid json' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: null } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'x'.repeat(4097) } }] },
    {
      choices: [
        { finish_reason: 'stop', message: { content: '{"insights":[],"advice":"unsafe"}' } },
      ],
    },
  ];
  for (const providerBody of badBodies) {
    const f = fixture({ providerBody });
    await assert.rejects(generateReport(input, 'synthetic-session', f.options), /ai_unavailable/);
  }
  const failure = fixture({ providerFailure: true });
  await assert.rejects(
    generateReport(input, 'synthetic-session', failure.options),
    (e: unknown) => e instanceof ReportError && e.message === 'ai_unavailable',
  );
});

test('private diary text stays with Supabase while Groq receives accurate partial totals', async () => {
  const row = {
    id: '60000000-0000-4000-8000-000000000003',
    baby_id: babyId,
    event_type: 'meal',
    occurred_at: '2026-03-09T23:00:00Z',
    ended_at: null,
    updated_at: '2026-03-10T00:00:00Z',
    note: 'PRIVATE DIARY NOTE',
    recorded_by: actor,
    server_version: 1,
    deleted_at: null,
    detail: {
      food_name: 'PRIVATE FOOD NAME',
      ingredients: 'PRIVATE INGREDIENTS',
      portion_offered: 60,
      portion_consumed: 50,
      portion_unit: 'g',
      texture: 'puree',
      first_exposure: null,
      reaction: null,
      nutrition: {
        source: 'PRIVATE NUTRITION SOURCE',
        calories_kcal: 50,
        protein_g: 2,
        carbs_g: null,
        fat_g: 0,
        fiber_g: null,
        iron_mg: 0.5,
        calcium_mg: null,
      },
    },
  };
  const f = fixture({ rows: [row] });
  const result = await generateReport(input, 'synthetic-session', f.options);
  const body = f.calls.find((c) => c.url === providerUrl)!.body as {
    messages: { content: string }[];
  };
  assert.ok(!JSON.stringify(body).includes('PRIVATE'));
  assert.ok(!JSON.stringify(body).includes(row.id));
  const facts = JSON.parse(body.messages[1]!.content);
  assert.equal(facts.totals.calories_kcal.total, 50);
  assert.equal(facts.totals.fat_g.total, 0);
  assert.equal(facts.totals.carbs_g.total, null);
  assert.equal(result.report.totals.calories_kcal.total, 50);
});

test('unexpected, ineligible and overlong insight lists fail closed; duplicate eligible codes are deduplicated', async () => {
  for (const output of [['missing_nutrition'], ['prescribe_iron'], Array(7).fill('sparse_days')]) {
    const f = fixture({ output });
    await assert.rejects(generateReport(input, 'synthetic-session', f.options), /ai_unavailable/);
  }
  const f = fixture({ output: ['sparse_days', 'sparse_days', 'review_sources'] });
  assert.deepEqual((await generateReport(input, 'synthetic-session', f.options)).insights, [
    'review_sources',
    'sparse_days',
  ]);
});
