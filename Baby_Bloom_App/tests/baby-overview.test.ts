import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Baby, SavedEvent } from '../src/domain/events.ts';
import { babyOverview, measurementGeometry } from '../src/domain/baby-overview.ts';

const now = new Date('2026-03-10T12:00:00Z');
const baby: Baby = {
  id: 'synthetic-baby',
  nickname: 'Synthetic',
  date_of_birth: '2026-01-01',
  timezone: 'Asia/Jakarta',
  gestation_weeks: 32,
  gestation_days: 0,
  growth_reference_sex: 'female',
  role: 'owner',
};
const measure = (
  id: string,
  at: string,
  weight: number | null,
  length: number | null = null,
  head: number | null = null,
): SavedEvent => ({
  id,
  baby_id: baby.id,
  event_type: 'measurement',
  occurred_at: at,
  ended_at: null,
  note: null,
  detail: { weight_kg: weight, length_cm: length, head_cm: head },
  recorded_by: 'synthetic-caregiver',
  server_version: 1,
  deleted_at: null,
  sync_status: 'synced',
});

test('overview keeps independently dated latest measurements and marks local measurements pending', () => {
  const old = measure('a', '2026-03-01T10:00:00Z', 4, 55, 37);
  const recent = { ...measure('b', '2026-03-09T10:00:00Z', 4.2), sync_status: 'queued' as const };
  const overview = babyOverview([recent, old], baby, now);
  assert.equal(overview.latest.weight_kg?.value, 4.2);
  assert.equal(overview.latest.weight_kg?.syncStatus, 'queued');
  assert.equal(overview.latest.length_cm?.at, old.occurred_at);
  assert.equal(overview.latest.head_cm?.value, 37);
  assert.equal(overview.weightChange, 0.2);
  assert.equal(overview.pending, 1);
  assert.equal(overview.correctedDays, 12);
});

test('statistics exclude other babies, deleted, conflicting, future and pre-birth measurements', () => {
  const valid = measure('a', '2026-03-01T10:00:00Z', 4);
  const entries = [
    valid,
    { ...measure('b', valid.occurred_at, 7), baby_id: 'other-baby' },
    { ...measure('c', valid.occurred_at, 8), deleted_at: now.toISOString() },
    { ...measure('d', valid.occurred_at, 9), sync_status: 'conflict' as const },
    measure('e', '2026-03-11T10:00:00Z', 10),
    measure('f', '2025-12-30T10:00:00Z', 11),
  ];
  const result = babyOverview(entries, baby, now);
  assert.equal(result.series.weight_kg.length, 1);
  assert.equal(result.latest.weight_kg?.value, 4);
  assert.equal(result.weightChange, null);
  assert.equal(result.conflicts, 1);
});

test('weight comparisons preserve a decrease and observed zero change; missing remains unknown', () => {
  const a = measure('a', '2026-03-01T10:00:00Z', 4);
  const b = measure('b', '2026-03-09T10:00:00Z', 3.8);
  assert.equal(babyOverview([a, b], baby, now).weightChange, -0.2);
  assert.equal(babyOverview([a, { ...b, detail: a.detail }], baby, now).weightChange, 0);
  const empty = babyOverview([], baby, now);
  assert.equal(empty.weightChange, null);
  assert.equal(empty.today.feeding_count, null);
  assert.equal(empty.report.totals.calories_kcal.total, null);
});

test('daily care follows the baby timezone and excludes future events while nutrition retains recorded zero', () => {
  const meal: SavedEvent = {
    ...measure('a', '2026-03-09T18:00:00Z', null),
    event_type: 'meal',
    detail: {
      food_name: 'Synthetic food',
      ingredients: null,
      portion_offered: 10,
      portion_consumed: 0,
      portion_unit: 'g',
      texture: null,
      first_exposure: null,
      reaction: null,
      nutrition: {
        source: 'Synthetic label',
        calories_kcal: 0,
        protein_g: 0,
        fat_g: null,
        carbs_g: null,
        fiber_g: null,
        iron_mg: null,
        calcium_mg: null,
      },
    },
  };
  const result = babyOverview(
    [meal, { ...meal, id: 'b', occurred_at: '2026-03-10T13:00:00Z' }],
    baby,
    now,
  );
  assert.equal(result.day, '2026-03-10');
  assert.equal(result.mealsToday, 1);
  assert.equal(result.report.totals.calories_kcal.total, 0);
  assert.equal(result.report.coverage.portions, 1);
});

test('multiple readings at the same instant do not invent an interval and unknown gestation stays unknown', () => {
  const a = measure('a', '2026-03-01T10:00:00Z', 4);
  const b = measure('b', a.occurred_at, 4.1);
  assert.equal(babyOverview([b, a], baby, now).weightChange, null);
  assert.equal(babyOverview([a], { ...baby, gestation_days: null }, now).correctedDays, null);
});

test('chart spacing uses actual dates and remains finite for equal values and duplicate timestamps', () => {
  const points = [0, 1, 10].map((day) => ({
    value: 4,
    at: new Date(Date.parse('2026-03-01T00:00:00Z') + day * 86400000).toISOString(),
    syncStatus: 'synced' as const,
  }));
  const chart = measurementGeometry(points)!;
  assert.ok(Math.abs(chart.points[1]!.x - 59.2) < 1e-8);
  assert.equal(chart.points[0]!.y, chart.points[2]!.y);
  assert.equal(measurementGeometry([points[0]!, points[0]!])!.points[0]!.x, 160);
  assert.equal(measurementGeometry([]), null);
  assert.ok(chart.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
