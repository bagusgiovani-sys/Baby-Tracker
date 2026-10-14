import type { Baby, SavedEvent } from './events.ts';
import { dayKey, dayRange } from './time.ts';
import { nutrientKeys, type NutrientKey } from './journal.ts';
import { summarize } from './totals.ts';
export const insightCodes = [
  'missing_nutrition',
  'breast_unquantified',
  'sparse_days',
  'premature_context',
  'measurement_missing',
  'review_sources',
  'observations_review',
] as const;
export type InsightCode = (typeof insightCodes)[number];
export type DiaryReport = ReturnType<typeof buildReport>;
export function reportDays(endDay: string, days: 7 | 30) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDay)) throw new Error('invalid');
  const end = Date.parse(endDay + 'T00:00:00Z');
  if (!Number.isFinite(end) || new Date(end).toISOString().slice(0, 10) !== endDay)
    throw new Error('invalid');
  return Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}
function sumNutrition(entries: SavedEvent[]) {
  const values = entries.flatMap((e) =>
    e.event_type === 'meal' || e.event_type === 'feeding'
      ? e.detail.nutrition
        ? [e.detail.nutrition]
        : []
      : [],
  );
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      const known = values.map((n) => n[key]).filter((v): v is number => v !== null);
      return [
        key,
        {
          total: known.length ? Math.round(known.reduce((sum, v) => sum + v, 0) * 100) / 100 : null,
          knownPortions: known.length,
        },
      ];
    }),
  ) as Record<NutrientKey, { total: number | null; knownPortions: number }>;
}
export function buildReport(
  events: SavedEvent[],
  baby: Baby,
  endDay: string,
  days: 7 | 30,
  now = new Date(),
) {
  if (days !== 7 && days !== 30) throw new Error('invalid');
  if (endDay > dayKey(now, baby.timezone)) throw new Error('invalid');
  const dates = reportDays(endDay, days);
  const range: [number, number] = [
    dayRange(dates[0]!, baby.timezone)[0],
    Math.min(dayRange(endDay, baby.timezone)[1], now.getTime() + 1),
  ];
  const all = events.filter(
    (e) => e.baby_id === baby.id && !e.deleted_at && e.sync_status !== 'conflict',
  );
  const entries = all.filter(
    (e) => Date.parse(e.occurred_at) >= range[0] && Date.parse(e.occurred_at) < range[1],
  );
  const portions = entries.filter((e) => e.event_type === 'feeding' || e.event_type === 'meal');
  const nutritionCount = portions.filter(
    (e) =>
      (e.event_type === 'meal' || e.event_type === 'feeding') &&
      e.detail.nutrition &&
      nutrientKeys.some((key) => e.detail.nutrition![key] !== null),
  ).length;
  const directBreast = portions.filter(
    (e) => e.event_type === 'feeding' && e.detail.feeding_kind === 'direct_breast',
  ).length;
  const daily = dates.map((day) => {
    const dayEntries = entries.filter(
      (e) => dayKey(new Date(e.occurred_at), baby.timezone) === day,
    );
    return {
      day,
      entries: dayEntries.length,
      calories: sumNutrition(dayEntries).calories_kcal.total,
    };
  });
  const loggedDays = daily.filter((d) => d.entries > 0).length;
  const chronologicalDays = Math.max(
    0,
    Math.floor(
      (Date.parse(endDay + 'T00:00:00Z') - Date.parse(baby.date_of_birth + 'T00:00:00Z')) /
        86400000,
    ),
  );
  const premature = baby.gestation_weeks !== null && baby.gestation_weeks < 37;
  const gestationDays =
    baby.gestation_weeks !== null && baby.gestation_days !== null
      ? baby.gestation_weeks * 7 + baby.gestation_days
      : null;
  const secondBirthday = new Date(baby.date_of_birth + 'T00:00:00Z');
  secondBirthday.setUTCFullYear(secondBirthday.getUTCFullYear() + 2);
  const correctedDays =
    premature && endDay < secondBirthday.toISOString().slice(0, 10) && gestationDays !== null
      ? Math.max(0, chronologicalDays - (280 - gestationDays))
      : null;
  const measurements = all
    .filter(
      (e): e is SavedEvent & { event_type: 'measurement' } =>
        e.event_type === 'measurement' && Date.parse(e.occurred_at) < range[1],
    )
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  const latest = measurements[0];
  const context = {
    chronologicalDays,
    correctedDays,
    premature,
    gestationWeeks: baby.gestation_weeks,
    gestationDays: baby.gestation_days,
    measurement: latest
      ? {
          ...latest.detail,
          ageInDays: Math.floor((range[1] - Date.parse(latest.occurred_at)) / 86400000),
        }
      : null,
  };
  const eligible: InsightCode[] = ['review_sources'];
  if (nutritionCount < portions.length) eligible.push('missing_nutrition');
  if (directBreast) eligible.push('breast_unquantified');
  if (loggedDays < days) eligible.push('sparse_days');
  if (premature) eligible.push('premature_context');
  if (!latest) eligible.push('measurement_missing');
  const concerns = {
    foodReactions: entries.filter(
      (e) => e.event_type === 'meal' && e.detail.reaction === 'observed',
    ).length,
    bloodObserved: entries.filter((e) => e.event_type === 'diaper' && e.detail.blood_seen === 'yes')
      .length,
    checkinsWithConcerns: entries.filter(
      (e) =>
        e.event_type === 'checkin' &&
        ['different', 'less', 'difficulty', 'fewer', 'yes'].some((v) =>
          (
            [
              e.detail.overall,
              e.detail.feeding_vs_usual,
              e.detail.wet_diapers_vs_usual,
              e.detail.sleep_concern,
              e.detail.new_symptoms,
            ] as readonly string[]
          ).includes(v),
        ),
    ).length,
  };
  if (Object.values(concerns).some((n) => n > 0)) eligible.push('observations_review');
  return {
    days,
    startDay: dates[0]!,
    endDay,
    timezone: baby.timezone,
    range,
    totals: sumNutrition(entries),
    coverage: {
      loggedDays,
      portions: portions.length,
      nutritionCount,
      unquantified: portions.length - nutritionCount,
      directBreast,
    },
    context,
    daily,
    care: summarize(all, baby.id, range, now),
    concerns,
    eligible,
    pending: all.filter((e) => e.sync_status !== 'synced' && Date.parse(e.occurred_at) < range[1])
      .length,
    conflicts: events.filter(
      (e) =>
        e.baby_id === baby.id &&
        !e.deleted_at &&
        e.sync_status === 'conflict' &&
        Date.parse(e.occurred_at) < range[1],
    ).length,
  };
}
// Never send names, dates of birth, identifiers, or free text to the AI provider.
export function aiFacts(report: DiaryReport) {
  return {
    days: report.days,
    totals: report.totals,
    coverage: report.coverage,
    context: report.context,
    eligible: report.eligible,
    care: report.care,
    concerns: report.concerns,
  };
}
