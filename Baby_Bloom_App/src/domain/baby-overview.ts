import type { Baby, SavedEvent } from './events.ts';
import { ageOn, dayKey, dayRange } from './time.ts';
import { buildReport } from './reports.ts';
import { summarize } from './totals.ts';

export const measurementMetrics = ['weight_kg', 'length_cm', 'head_cm'] as const;
export type MeasurementMetric = (typeof measurementMetrics)[number];
export type MeasurementPoint = {
  value: number;
  at: string;
  syncStatus: SavedEvent['sync_status'];
};

export function babyOverview(events: SavedEvent[], baby: Baby, now: Date) {
  const day = dayKey(now, baby.timezone);
  const birthDay = Date.parse(baby.date_of_birth + 'T00:00:00Z');
  const visible = events.filter(
    (e) =>
      e.baby_id === baby.id &&
      !e.deleted_at &&
      e.sync_status !== 'conflict' &&
      Number.isFinite(Date.parse(e.occurred_at)) &&
      Date.parse(e.occurred_at) <= now.getTime() &&
      Date.parse(dayKey(new Date(e.occurred_at), baby.timezone) + 'T00:00:00Z') >= birthDay,
  );
  const measurements = visible
    .filter((e) => e.event_type === 'measurement')
    .sort(
      (a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at) || a.id.localeCompare(b.id),
    );
  const series = Object.fromEntries(
    measurementMetrics.map((metric) => [
      metric,
      measurements.flatMap((e): MeasurementPoint[] => {
        const value = e.detail[metric];
        return value !== null && Number.isFinite(value) && value > 0
          ? [{ value, at: e.occurred_at, syncStatus: e.sync_status }]
          : [];
      }),
    ]),
  ) as Record<MeasurementMetric, MeasurementPoint[]>;
  const range = dayRange(day, baby.timezone);
  range[1] = Math.min(range[1], now.getTime() + 1);
  const today = visible.filter((e) => Date.parse(e.occurred_at) >= range[0]);
  const report = buildReport(visible, baby, day, 7, now);
  const checkin = today
    .filter((e) => e.event_type === 'checkin')
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0];
  const latest = Object.fromEntries(
    measurementMetrics.map((metric) => [metric, series[metric].at(-1) ?? null]),
  ) as Record<MeasurementMetric, MeasurementPoint | null>;
  const latestWeight = latest.weight_kg;
  const previousWeight =
    series.weight_kg
      .slice(0, -1)
      .reverse()
      .find((point) => point.at !== latestWeight?.at) ?? null;
  const weightChange =
    previousWeight && latestWeight && previousWeight.at !== latestWeight.at
      ? Math.round((latestWeight.value - previousWeight.value) * 1000) / 1000
      : null;
  return {
    day,
    age: ageOn(baby.date_of_birth, day),
    chronologicalDays: report.context.chronologicalDays,
    correctedDays: report.context.correctedDays,
    premature: report.context.premature,
    series,
    latest,
    previousWeight,
    weightChange,
    today: summarize(visible, baby.id, range, now),
    mealsToday: today.filter((e) => e.event_type === 'meal').length || null,
    checkin: checkin?.event_type === 'checkin' ? checkin.detail.state : null,
    report,
    pending: visible.filter((e) => e.sync_status !== 'synced').length,
    conflicts: events.filter(
      (e) => e.baby_id === baby.id && !e.deleted_at && e.sync_status === 'conflict',
    ).length,
  };
}

// Coordinates use actual timestamps, without growth references or forecasts.
export function measurementGeometry(points: MeasurementPoint[]) {
  if (!points.length) return null;
  const times = points.map((p) => Date.parse(p.at));
  const first = Math.min(...times);
  const last = Math.max(...times);
  const values = points.map((p) => p.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.15, maximum * 0.02, 0.01);
  const lower = Math.max(0, minimum - padding);
  const upper = maximum + padding;
  return {
    lower,
    upper,
    first,
    last,
    points: points.map((p, index) => ({
      x: last === first ? 160 : 32 + ((times[index]! - first) / (last - first)) * 272,
      y: 16 + ((upper - p.value) / (upper - lower)) * 112,
    })),
  };
}
