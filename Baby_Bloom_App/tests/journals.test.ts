import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, type Baby, type SavedEvent } from '../src/domain/events.ts';
import { buildReport, aiFacts, reportDays } from '../src/domain/reports.ts';
import { parseAppearance } from '../src/lib/theme-palette.ts';
const uuid = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date('2026-03-10T12:00:00Z');
const baby: Baby = {
  id: uuid(1),
  nickname: 'Synthetic Name',
  date_of_birth: '2026-01-01',
  timezone: 'Asia/Jakarta',
  gestation_weeks: 32,
  gestation_days: 0,
  growth_reference_sex: null,
  role: 'owner',
};
const nutrition = {
  source: 'Synthetic label',
  calories_kcal: 50,
  protein_g: 2,
  carbs_g: null,
  fat_g: 0,
  fiber_g: null,
  iron_mg: 0.5,
  calcium_mg: null,
};
const meal = (n = 2) => ({
  id: uuid(n),
  baby_id: baby.id,
  event_type: 'meal' as const,
  occurred_at: '2026-03-09T23:00:00Z',
  ended_at: null,
  note: 'Synthetic sensitive note',
  detail: {
    food_name: 'Synthetic puree',
    ingredients: null,
    portion_offered: 60,
    portion_consumed: 50,
    portion_unit: 'g' as const,
    texture: 'puree' as const,
    first_exposure: null,
    reaction: null,
    nutrition,
  },
});
const saved = (value: unknown): SavedEvent => ({
  ...validateEvent(value, now),
  recorded_by: uuid(3),
  server_version: 1,
  deleted_at: null,
  sync_status: 'synced',
});
test('journal validation preserves observed zero, rejects over-consumption and nutrition without a consumed portion', () => {
  assert.equal(validateEvent(meal(), now).event_type, 'meal');
  assert.throws(
    () => validateEvent({ ...meal(), detail: { ...meal().detail, portion_consumed: 61 } }, now),
    /consumed_exceeds_offered/,
  );
  assert.throws(
    () => validateEvent({ ...meal(), detail: { ...meal().detail, portion_consumed: null } }, now),
    /nutrition_needs_portion/,
  );
  assert.throws(() =>
    validateEvent(
      { ...meal(), detail: { ...meal().detail, nutrition: { ...nutrition, protein_g: -1 } } },
      now,
    ),
  );
  assert.throws(() =>
    validateEvent(
      { ...meal(), detail: { ...meal().detail, nutrition: { ...nutrition, diagnosis: 'unsafe' } } },
      now,
    ),
  );
});
test('reports scope baby, timezone, tombstones, conflicts and partial nutrients without inventing missing intake', () => {
  const entries = [
    saved(meal()),
    saved({ ...meal(4), baby_id: uuid(5) }),
    { ...saved(meal(6)), deleted_at: now.toISOString() },
    { ...saved(meal(7)), sync_status: 'conflict' as const },
  ];
  const result = buildReport(entries, baby, '2026-03-10', 7, now);
  assert.equal(result.totals.calories_kcal.total, 50);
  assert.equal(result.totals.fat_g.total, 0);
  assert.equal(result.totals.carbs_g.total, null);
  assert.equal(result.coverage.loggedDays, 1);
  assert.equal(result.daily[6]!.calories, 50);
  assert.equal(result.daily[5]!.calories, null);
  assert.equal(result.context.chronologicalDays, 68);
  assert.equal(result.context.correctedDays, 12);
  assert.ok(result.eligible.includes('premature_context'));
  assert.throws(() => buildReport(entries, baby, '2026-03-11', 7, now));
  assert.throws(() => reportDays('2026-02-30', 7));
  assert.equal(reportDays('2026-03-10', 30).length, 30);
});
test('direct breastfeeding remains unquantified; corrected age needs gestation days and ends at the second birthday', () => {
  const breastfeeding = saved({
    ...meal(),
    event_type: 'feeding',
    detail: {
      feeding_kind: 'direct_breast',
      breast_side: null,
      volume_offered_ml: null,
      volume_consumed_ml: null,
    },
  });
  const report = buildReport([breastfeeding], baby, '2026-03-10', 7, now);
  assert.equal(report.totals.calories_kcal.total, null);
  assert.equal(report.coverage.directBreast, 1);
  assert.ok(report.eligible.includes('breast_unquantified'));
  assert.throws(() =>
    validateEvent({ ...breastfeeding, detail: { ...breastfeeding.detail, nutrition } }, now),
  );
  assert.equal(
    buildReport([], { ...baby, gestation_days: null }, '2026-03-10', 7, now).context.correctedDays,
    null,
  );
  assert.equal(
    buildReport([], baby, '2028-01-01', 7, new Date('2028-01-02')).context.correctedDays,
    null,
  );
});
test('AI facts exclude names, dates of birth, free text, IDs, and nutrition-source text', () => {
  const facts = JSON.stringify(aiFacts(buildReport([saved(meal())], baby, '2026-03-10', 7, now)));
  for (const text of [
    baby.nickname,
    baby.date_of_birth,
    baby.id,
    meal().note,
    nutrition.source,
    '2026-03-10',
    'Synthetic puree',
  ])
    assert.ok(!facts.includes(text));
});
test('measurement journal requires an actual measurement and daily check-in date matches its IANA timezone', () => {
  assert.throws(
    () =>
      validateEvent(
        {
          ...meal(),
          event_type: 'measurement',
          detail: { weight_kg: null, length_cm: null, head_cm: null },
        },
        now,
      ),
    /measurement_required/,
  );
  assert.equal(
    validateEvent(
      {
        ...meal(),
        event_type: 'measurement',
        detail: { weight_kg: 4.2, length_cm: 53, head_cm: null },
      },
      now,
    ).event_type,
    'measurement',
  );
  const detail = {
    local_day: '2026-03-10',
    timezone_at_entry: 'Asia/Jakarta',
    state: 'completed',
    overall: 'not_answered',
    feeding_vs_usual: 'not_answered',
    wet_diapers_vs_usual: 'not_answered',
    sleep_concern: 'not_answered',
    new_symptoms: 'not_answered',
    parent_concern: null,
  };
  assert.equal(
    validateEvent({ ...meal(), event_type: 'checkin', detail }, now).event_type,
    'checkin',
  );
  assert.throws(() =>
    validateEvent(
      { ...meal(), event_type: 'checkin', detail: { ...detail, local_day: '2026-03-09' } },
      now,
    ),
  );
});
test('cached appearance validates its version and never treats malformed preferences as a completed first visit', () => {
  assert.equal(parseAppearance('{broken'), null);
  assert.equal(
    parseAppearance(
      JSON.stringify({ version: 1, theme: 'unicorn', chosen: true, tutorialSeen: true }),
    )?.theme,
    'unicorn',
  );
  assert.equal(
    parseAppearance(
      JSON.stringify({ version: 2, theme: 'unicorn', chosen: true, tutorialSeen: true }),
    ),
    null,
  );
});
