import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { eventSchema, type Baby, type SavedEvent } from '../domain/events.ts';
import { buildReport, aiFacts, type InsightCode } from '../domain/reports.ts';
export const requestSchema = z
  .object({
    babyId: z.uuid(),
    days: z.union([z.literal(7), z.literal(30)]),
    endDay: z.iso.date(),
    consent: z.literal(true),
  })
  .strict();
type Options = {
  url?: string;
  publicKey?: string;
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  now?: Date;
};
export class ReportError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function generateReport(input: unknown, bearer: string, options: Options = {}) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new ReportError(400, 'invalid');
  if (!bearer) throw new ReportError(401, 'unauthorized');
  if (!options.url || !options.publicKey) throw new ReportError(503, 'config_required');
  const fetcher = options.fetcher ?? fetch;
  const client = createClient(options.url, options.publicKey, {
    global: { headers: { Authorization: 'Bearer ' + bearer }, fetch: fetcher },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identity = await client.auth.getUser(bearer);
  if (identity.error || !identity.data.user) throw new ReportError(401, 'unauthorized');
  const babies = await client.rpc('list_babies');
  if (babies.error) throw new ReportError(403, 'unauthorized');
  const baby = (babies.data as Baby[]).find((b) => b.id === parsed.data.babyId);
  if (!baby) throw new ReportError(403, 'unauthorized');
  if (!options.apiKey) throw new ReportError(503, 'ai_not_configured');
  const events: SavedEvent[] = [];
  let after: string | null = null;
  let afterId: string | null = null;
  let complete = false;
  for (let page = 0; page < 100; page++) {
    const result = await client.rpc('list_events', {
      p_baby_id: baby.id,
      p_after: after,
      p_after_id: afterId,
    });
    if (result.error)
      throw new ReportError(
        result.error.message.includes('unauthorized') ? 403 : 502,
        result.error.message.includes('unauthorized') ? 'unauthorized' : 'error',
      );
    const rows = result.data as (SavedEvent & { updated_at: string })[];
    for (const row of rows) {
      const { id, baby_id, event_type, occurred_at, ended_at, note, detail } = row;
      events.push({
        ...eventSchema.parse({ id, baby_id, event_type, occurred_at, ended_at, note, detail }),
        recorded_by: row.recorded_by,
        server_version: row.server_version,
        deleted_at: row.deleted_at,
        sync_status: 'synced',
      });
    }
    if (rows.length < 500) {
      complete = true;
      break;
    }
    after = rows[rows.length - 1]!.updated_at;
    afterId = rows[rows.length - 1]!.id;
  }
  if (!complete) throw new ReportError(422, 'report_too_large');
  let report;
  try {
    report = buildReport(events, baby, parsed.data.endDay, parsed.data.days, options.now);
  } catch {
    throw new ReportError(400, 'invalid');
  }
  const quota = await client.rpc('claim_report_request', { p_baby_id: baby.id });
  if (quota.error)
    throw new ReportError(
      quota.error.message.includes('unauthorized') ? 403 : 503,
      quota.error.message.includes('unauthorized') ? 'unauthorized' : 'backend_update_required',
    );
  if (!quota.data) throw new ReportError(429, 'ai_rate_limited');
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + options.apiKey, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(35000),
    body: JSON.stringify({
      model: options.model ?? 'gpt-4.1-mini-2025-04-14',
      store: false,
      max_output_tokens: 700,
      instructions:
        'You prioritize grounded diary-review insights. Return only eligible insight codes, in priority order, maximum 6. The supplied totals are partial recorded intake, not complete biological intake. Never infer deficiency, adequacy, diagnosis, growth percentiles, breastfeeding volume, dosing, or treatment. Prematurity and measurements are consultation context. Include review_sources. Do not produce prose or new numerical claims.',
      input: JSON.stringify(aiFacts(report)),
      text: {
        format: {
          type: 'json_schema',
          name: 'diary_insights',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              insights: { type: 'array', items: { type: 'string', enum: report.eligible } },
            },
            required: ['insights'],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!response.ok) throw new ReportError(502, 'ai_unavailable');
  const body = (await response.json()) as {
    status?: string;
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  if (body.status !== 'completed') throw new ReportError(502, 'ai_unavailable');
  const texts =
    body.output?.flatMap((item) =>
      item.type === 'message'
        ? (item.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text ?? '')
        : [],
    ) ?? [];
  let output: unknown;
  try {
    output = JSON.parse(texts.join(''));
  } catch {
    throw new ReportError(502, 'ai_unavailable');
  }
  const checked = z
    .object({
      insights: z.array(z.enum(report.eligible as [InsightCode, ...InsightCode[]])).max(6),
    })
    .strict()
    .safeParse(output);
  if (!checked.success) throw new ReportError(502, 'ai_unavailable');
  const insights = [...new Set(['review_sources' as const, ...checked.data.insights])].slice(0, 6);
  return { insights, report };
}
