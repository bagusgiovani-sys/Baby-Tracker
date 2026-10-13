import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, durationSeconds, babySchema } from '../src/domain/events.ts';
import type { CareEvent, SavedEvent } from '../src/domain/events.ts';
import { ageOn, dayRange, dayKey, wallTimeCandidates } from '../src/domain/time.ts';
import { summarize } from '../src/domain/totals.ts';
export const babyId = '30000000-0000-4000-8000-000000000001';
export const ownerId = '30000000-0000-4000-8000-000000000002';
export const eventId = n => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date('2026-01-02T06:00:00Z');
export const feed = (n = 10): CareEvent => ({ id: eventId(n), baby_id: babyId, event_type: 'feeding', occurred_at: '2026-01-01T20:00:00Z', ended_at: null, note: null, detail: { feeding_kind: 'direct_breast', breast_side: null, volume_offered_ml: null, volume_consumed_ml: null } });
const saved = (e: CareEvent): SavedEvent => ({ ...e, recorded_by: ownerId, server_version: 0, deleted_at: null, sync_status: 'queued' });
test('empty direct breastfeeding is valid, cannot invent volume', () => {
    assert.equal(validateEvent(feed(), now).event_type, 'feeding');
    assert.throws(() => validateEvent({ ...feed(), detail: { ...feed().detail, volume_consumed_ml: 10 } }, now), /breast_no_volume/);
});
test('bottle optional volume, explicit zero, limits, precision and consumed/offered', () => {
    const bottle = { ...feed(), detail: { feeding_kind: 'formula_bottle', breast_side: null, volume_offered_ml: null, volume_consumed_ml: null } };
    assert.equal(validateEvent(bottle, now).event_type, 'feeding');
    assert.doesNotThrow(() => validateEvent({ ...bottle, detail: { ...bottle.detail, volume_consumed_ml: 0 } }, now));
    for (const volume of [-1, 100000, 1.11, NaN, Infinity])
        assert.throws(() => validateEvent({ ...bottle, detail: { ...bottle.detail, volume_consumed_ml: volume } }, now));
    assert.throws(() => validateEvent({ ...bottle, detail: { ...bottle.detail, volume_offered_ml: 2000 } }, now));
    assert.throws(() => validateEvent({ ...bottle, detail: { ...bottle.detail, volume_offered_ml: 10, volume_consumed_ml: 11 } }, now), /consumed_exceeds_offered/);
});
test('diaper optional fields preserve null and observed no', () => {
    const dirty = { ...feed(), event_type: 'diaper', detail: { diaper_kind: 'dirty', stool_color: null, stool_consistency: null, stool_amount: null, blood_seen: null, mucus_seen: null, urine_unusual: null, rash_present: null } };
    const parsed = validateEvent(dirty, now);
    assert.equal(parsed.event_type, 'diaper');
    if (parsed.event_type === 'diaper')
        assert.equal(parsed.detail.blood_seen, null);
    assert.doesNotThrow(() => validateEvent({ ...dirty, detail: { ...dirty.detail, blood_seen: 'no' } }, now));
    assert.throws(() => validateEvent({ ...dirty, detail: { ...dirty.detail, diaper_kind: 'wet', blood_seen: 'no' } }, now));
});
test('timestamps reject end before start, validate future confirmation, compute duration', () => {
    assert.throws(() => validateEvent({ ...feed(), ended_at: '2025-01-01T00:00:00Z' }, now), /end_before_start/);
    const future = { ...feed(), occurred_at: '2026-01-02T07:00:00Z' };
    assert.throws(() => validateEvent(future, now), /future_confirmation/);
    assert.doesNotThrow(() => validateEvent(future, now, true));
    assert.equal(durationSeconds({ ...feed(), ended_at: '2026-01-01T20:15:00Z' }, now), 900);
});
test('local day respects Jakarta and New York 23/25 hour DST days', () => {
    assert.equal(dayKey(new Date('2026-01-01T18:00:00Z'), 'Asia/Jakarta'), '2026-01-02');
    assert.equal(new Date(dayRange('2026-01-02', 'Asia/Jakarta')[0]).toISOString(), '2026-01-01T17:00:00.000Z');
    for (const [day, hours] of [['2026-03-08', 23], ['2026-11-01', 25]] as const) {
        const [start, end] = dayRange(day, 'America/New_York');
        assert.equal((end - start) / 3600000, hours);
    }
    assert.throws(() => dayRange('2026-02-30', 'Asia/Jakarta'));
});
test('summaries distinguish absent/zero, both diapers, missing bottle volume, and babies', () => {
    const range = dayRange('2026-01-02', 'Asia/Jakarta');
    assert.equal(summarize([], babyId, range, now).feeding_count, null);
    const both: CareEvent = { ...feed(11), event_type: 'diaper', detail: { diaper_kind: 'both', stool_color: null, stool_consistency: null, stool_amount: null, blood_seen: null, mucus_seen: null, urine_unusual: null, rash_present: null } };
    const bottle: CareEvent = { ...feed(12), event_type: 'feeding', detail: { feeding_kind: 'formula_bottle', breast_side: null, volume_offered_ml: 50, volume_consumed_ml: 0 } };
    const missing: CareEvent = { ...bottle, id: eventId(13), detail: { ...bottle.detail, volume_consumed_ml: null } };
    const totals = summarize([saved(feed()), saved(both), saved(bottle), saved(missing), saved({ ...feed(14), baby_id: eventId(99) })], babyId, range, now);
    assert.equal(totals.feeding_count, 3);
    assert.equal(totals.wet_count, 1);
    assert.equal(totals.dirty_count, 1);
    assert.equal(totals.bottle_consumed_ml, 0);
    assert.equal(totals.missing_bottle_volume, 1);
});
test('sleep clips across midnight and unions overlaps; ongoing total is provisional', () => {
    const sleeping: CareEvent = { ...feed(15), event_type: 'sleep', occurred_at: '2026-01-01T16:00:00Z', ended_at: '2026-01-01T19:00:00Z', detail: { sleep_kind: null, interruptions_count: null } };
    const overlap = { ...sleeping, id: eventId(16), occurred_at: '2026-01-01T18:00:00Z', ended_at: '2026-01-01T20:00:00Z' };
    const range = dayRange('2026-01-02', 'Asia/Jakarta');
    assert.equal(summarize([saved(sleeping), saved(overlap)], babyId, range, now).sleep_minutes, 180);
    assert.equal(summarize([saved({ ...sleeping, ended_at: null })], babyId, range, now).provisional, true);
});
test('baby profile accepts optional reference sex/gestation and validates timezone/consent', () => {
    const baby = { nickname: 'Sprout', date_of_birth: '2025-12-01', timezone: 'Asia/Jakarta', gestation_weeks: null, gestation_days: null, growth_reference_sex: null, guardian_confirmed: true, policy_version: '2026-10-draft' };
    assert.doesNotThrow(() => babySchema.parse(baby));
    assert.throws(() => babySchema.parse({ ...baby, guardian_confirmed: false }));
    assert.throws(() => babySchema.parse({ ...baby, timezone: 'bad' }));
});
test('editable local times reject DST gaps and expose both repeated instants', () => {
    assert.deepEqual(wallTimeCandidates('2026-03-08', '02:30', 'America/New_York'), []);
    assert.deepEqual(wallTimeCandidates('2026-11-01', '01:30', 'America/New_York'), ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
    assert.deepEqual(wallTimeCandidates('2026-01-02', '00:15', 'Asia/Jakarta'), ['2026-01-01T17:15:00.000Z']);
    assert.deepEqual(wallTimeCandidates('2026-02-30', '10:00', 'Asia/Jakarta'), []);
});
test('chronological age handles end-of-month and leap-day birthdays', () => {
    assert.deepEqual(ageOn('2024-02-29', '2025-02-28'), { months: 12, days: 0 });
    assert.deepEqual(ageOn('2026-01-31', '2026-03-01'), { months: 1, days: 1 });
});
test('validated offset timestamps are normalized to UTC', () => {
    assert.equal(validateEvent({ ...feed(), occurred_at: '2026-01-02T03:00:00+07:00' }, now).occurred_at, '2026-01-01T20:00:00.000Z');
});
