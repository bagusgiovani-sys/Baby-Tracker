import { z } from 'zod';
import {
  mealDetailSchema,
  measurementDetailSchema,
  checkinDetailSchema,
  nutritionSchema,
} from './journal.ts';
import { dayKey } from './time.ts';
export const feedingKinds = [
  'direct_breast',
  'expressed_breastmilk_bottle',
  'formula_bottle',
  'mixed_bottle',
  'other_bottle',
] as const;
export const diaperKinds = ['wet', 'dirty', 'both', 'dry'] as const;
export const sides = ['left', 'right', 'both', 'unknown'] as const;
export const stoolColors = [
  'yellow',
  'brown',
  'green',
  'black',
  'red',
  'pale_white_grey',
  'other',
  'unknown',
] as const;
export const consistencies = ['watery', 'soft', 'pasty', 'formed', 'hard', 'unknown'] as const;
export const observations = ['yes', 'no', 'unsure', 'not_observed'] as const;
const offeredVolume = z.number().finite().min(0).lt(2000).multipleOf(0.1).nullable();
const consumedVolume = z.number().finite().min(0).max(99999.9).multipleOf(0.1).nullable();
const instant = z.iso.datetime({ offset: true });
const envelope = {
  id: z.uuid(),
  baby_id: z.uuid(),
  occurred_at: instant,
  ended_at: instant.nullable(),
  note: z.string().max(1000).nullable(),
};
const feeding = z
  .object({
    ...envelope,
    event_type: z.literal('feeding'),
    detail: z
      .object({
        feeding_kind: z.enum(feedingKinds),
        breast_side: z.enum(sides).nullable(),
        volume_offered_ml: offeredVolume,
        volume_consumed_ml: consumedVolume,
        nutrition: nutritionSchema.nullable().optional(),
      })
      .strict(),
  })
  .strict();
const diaper = z
  .object({
    ...envelope,
    event_type: z.literal('diaper'),
    detail: z
      .object({
        diaper_kind: z.enum(diaperKinds),
        stool_color: z.enum(stoolColors).nullable(),
        stool_consistency: z.enum(consistencies).nullable(),
        stool_amount: z.enum(['small', 'medium', 'large', 'unknown']).nullable(),
        blood_seen: z.enum(observations).nullable(),
        mucus_seen: z.enum(observations).nullable(),
        urine_unusual: z.enum(['yes', 'no', 'unsure']).nullable(),
        rash_present: z.enum(['yes', 'no', 'unsure']).nullable(),
      })
      .strict(),
  })
  .strict();
const sleep = z
  .object({
    ...envelope,
    event_type: z.literal('sleep'),
    detail: z
      .object({
        sleep_kind: z.enum(['nap', 'night', 'unspecified']).nullable(),
        interruptions_count: z.number().int().min(0).max(30).nullable(),
      })
      .strict(),
  })
  .strict();
export const eventSchema = z
  .discriminatedUnion('event_type', [
    feeding,
    diaper,
    sleep,
    z.object({ ...envelope, event_type: z.literal('meal'), detail: mealDetailSchema }).strict(),
    z
      .object({
        ...envelope,
        event_type: z.literal('measurement'),
        detail: measurementDetailSchema,
      })
      .strict(),
    z
      .object({ ...envelope, event_type: z.literal('checkin'), detail: checkinDetailSchema })
      .strict(),
  ])
  .superRefine((event, ctx) => {
    const fail = (path: string[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (event.ended_at && Date.parse(event.ended_at) < Date.parse(event.occurred_at))
      fail(['ended_at'], 'end_before_start');
    if (event.event_type === 'diaper' && event.ended_at) fail(['ended_at'], 'invalid');
    if (['meal', 'measurement', 'checkin'].includes(event.event_type) && event.ended_at)
      fail(['ended_at'], 'invalid');
    if (
      event.event_type === 'checkin' &&
      dayKey(new Date(event.occurred_at), event.detail.timezone_at_entry) !== event.detail.local_day
    )
      fail(['detail', 'local_day'], 'invalid');
    if (
      event.event_type === 'meal' &&
      event.detail.nutrition &&
      event.detail.portion_consumed === null
    )
      fail(['detail', 'nutrition'], 'nutrition_needs_portion');
    if (event.event_type === 'feeding') {
      const d = event.detail;
      if (d.nutrition && (d.feeding_kind === 'direct_breast' || d.volume_consumed_ml === null))
        fail(['detail', 'nutrition'], 'nutrition_needs_portion');
      if (
        d.feeding_kind === 'direct_breast' &&
        (d.volume_consumed_ml !== null || d.volume_offered_ml !== null)
      )
        fail(['detail', 'volume_consumed_ml'], 'breast_no_volume');
      if (d.feeding_kind !== 'direct_breast' && d.breast_side !== null)
        fail(['detail', 'breast_side'], 'invalid');
      if (
        d.volume_consumed_ml !== null &&
        d.volume_offered_ml !== null &&
        d.volume_consumed_ml > d.volume_offered_ml
      )
        fail(['detail', 'volume_consumed_ml'], 'consumed_exceeds_offered');
    }
    if (event.event_type === 'diaper') {
      const d = event.detail;
      if (
        !['dirty', 'both'].includes(d.diaper_kind) &&
        [d.stool_color, d.stool_consistency, d.stool_amount, d.blood_seen, d.mucus_seen].some(
          (x) => x !== null,
        )
      )
        fail(['detail', 'stool_color'], 'invalid');
      if (!['wet', 'both'].includes(d.diaper_kind) && d.urine_unusual !== null)
        fail(['detail', 'urine_unusual'], 'invalid');
    }
  });
export type CareEvent = z.infer<typeof eventSchema>;
export type SyncStatus = 'offline' | 'queued' | 'syncing' | 'synced' | 'error' | 'conflict';
export type SavedEvent = CareEvent & {
  recorded_by: string;
  server_version: number;
  deleted_at: string | null;
  sync_status: SyncStatus;
};
export type Baby = {
  id: string;
  nickname: string;
  date_of_birth: string;
  timezone: string;
  gestation_weeks: number | null;
  gestation_days: number | null;
  growth_reference_sex: 'female' | 'male' | null;
  role: 'owner' | 'editor' | 'viewer';
};
export function validateEvent(input: unknown, now: Date, futureConfirmed = false): CareEvent {
  const event = eventSchema.parse(input);
  if (
    !futureConfirmed &&
    [event.occurred_at, event.ended_at].some((t) => t && Date.parse(t) > now.getTime() + 300000)
  )
    throw new Error('future_confirmation');
  return {
    ...event,
    occurred_at: new Date(event.occurred_at).toISOString(),
    ended_at: event.ended_at ? new Date(event.ended_at).toISOString() : null,
  };
}
export function durationSeconds(event: CareEvent, now: Date): number {
  return Math.max(
    0,
    (Date.parse(event.ended_at ?? now.toISOString()) - Date.parse(event.occurred_at)) / 1000,
  );
}
export const babySchema = z
  .object({
    nickname: z.string().trim().min(1).max(80),
    date_of_birth: z.iso.date(),
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'invalid_timezone'),
    gestation_weeks: z.number().int().min(1).max(45).nullable(),
    gestation_days: z.number().int().min(0).max(6).nullable(),
    growth_reference_sex: z.enum(['female', 'male']).nullable(),
    guardian_confirmed: z.literal(true),
    policy_version: z.literal('2026-10-draft'),
  })
  .strict()
  .superRefine((baby, ctx) => {
    if (baby.gestation_days !== null && baby.gestation_weeks === null)
      ctx.addIssue({ code: 'custom', path: ['gestation_days'], message: 'invalid' });
  });
export type BabyInput = z.infer<typeof babySchema>;
