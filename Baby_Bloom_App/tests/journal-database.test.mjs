import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = (n) => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('journal database authorization, normalized nutrition, daily uniqueness, version conflicts and paid-call quotas', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create schema auth;create role anon nologin;create role authenticated nologin;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;alter default privileges in schema public grant all on tables to anon,authenticated;alter default privileges in schema public grant execute on functions to anon,authenticated;`,
    );
    for (let n = 1; n <= 4; n++) await db.query('insert into auth.users values($1)', [id(n)]);
    for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort())
      await db.exec(
        await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'),
      );
    const as = async (n) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]);
      await db.exec('set role authenticated');
    };
    const rpc = async (name, args) =>
      (
        await db.query(
          `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`,
          args,
        )
      ).rows[0].result;
    await as(1);
    const baby = await rpc('create_baby', [
      {
        nickname: 'Synthetic',
        date_of_birth: '2024-01-01',
        timezone: 'Asia/Jakarta',
        gestation_weeks: null,
        gestation_days: null,
        growth_reference_sex: null,
        guardian_confirmed: true,
        policy_version: '2026-10-draft',
      },
    ]);
    await db.exec('reset role');
    await db.query(
      "insert into public.baby_memberships(baby_id,user_id,role) values($1,$2,'editor'),($1,$3,'viewer')",
      [baby.id, id(2), id(3)],
    );
    await as(1);
    const nutrition = {
      source: 'Synthetic source',
      calories_kcal: 80,
      protein_g: 2.5,
      carbs_g: null,
      fat_g: 0,
      fiber_g: null,
      iron_mg: 0.7,
      calcium_mg: null,
    };
    const meal = {
      id: id(10),
      baby_id: baby.id,
      event_type: 'meal',
      occurred_at: '2025-01-01T23:00:00Z',
      ended_at: null,
      note: 'Synthetic private note',
      detail: {
        food_name: 'Synthetic meal',
        ingredients: null,
        portion_offered: 100,
        portion_consumed: 80,
        portion_unit: 'g',
        texture: 'puree',
        first_exposure: 'yes',
        reaction: 'not_observed',
        nutrition,
      },
    };
    const save = (e, n, v = 0, op = 'create') => rpc('save_care_event', [e, id(n), v, op, false]);
    await t.test(
      'typed journal details round-trip and duplicate receipts cannot duplicate nutrients',
      async () => {
        const first = await save(meal, 100);
        assert.equal(first.event.detail.nutrition.calories_kcal, 80);
        assert.equal(first.event.detail.nutrition.fat_g, 0);
        assert.equal(first.event.detail.nutrition.carbs_g, null);
        assert.equal((await save(meal, 100)).accepted_version, 1);
        assert.equal(
          (await db.query('select count(*)::int as n from event_nutrition')).rows[0].n,
          1,
        );
        assert.equal(await rpc('journal_schema_version', []), 3);
      },
    );
    await t.test(
      'invalid portion, nutrition injection and missing source roll back the envelope atomically',
      async () => {
        for (const detail of [
          { ...meal.detail, portion_consumed: 101 },
          { ...meal.detail, portion_consumed: null },
          { ...meal.detail, nutrition: { ...nutrition, source: '' } },
          { ...meal.detail, nutrition: { ...nutrition, protein_g: -2 } },
          { ...meal.detail, nutrition: { ...nutrition, extra_secret: true } },
        ])
          await assert.rejects(save({ ...meal, id: id(11), detail }, 101));
        assert.equal(
          (await db.query('select count(*)::int as n from care_events where id=$1', [id(11)]))
            .rows[0].n,
          0,
        );
        await assert.rejects(
          save(
            { ...meal, detail: { ...meal.detail, nutrition: { ...nutrition, protein_g: 99 } } },
            100,
          ),
          /validation/,
        );
      },
    );
    await t.test(
      'outsider and anonymous cannot read joined journals or submit writes; viewer can only read',
      async () => {
        await as(4);
        for (const table of [
          'meal_details',
          'event_nutrition',
          'measurement_details',
          'checkin_details',
        ])
          assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
        await assert.rejects(save({ ...meal, id: id(12) }, 102), /unauthorized/);
        await assert.rejects(rpc('claim_report_request', [baby.id]), /unauthorized/);
        await as(3);
        assert.equal((await db.query('select * from meal_details')).rows.length, 1);
        await assert.rejects(save({ ...meal, id: id(12) }, 102), /unauthorized/);
        for (const table of [
          'meal_details',
          'event_nutrition',
          'measurement_details',
          'checkin_details',
          'report_limits',
        ])
          await assert.rejects(db.query(`delete from ${table}`), /permission denied/);
        await db.exec('set role anon');
        await assert.rejects(db.query('select * from event_nutrition'), /permission denied/);
        await assert.rejects(rpc('journal_schema_version', []), /permission denied/);
        await as(1);
      },
    );
    await t.test(
      'editor changes preserve attribution and stale parent edits return full journal conflicts',
      async () => {
        await as(2);
        const updated = await save(
          { ...meal, detail: { ...meal.detail, nutrition: null } },
          103,
          1,
          'update',
        );
        assert.equal(updated.event.recorded_by, id(1));
        assert.equal(updated.event.server_version, 2);
        assert.equal(updated.event.detail.nutrition, null);
        await as(1);
        const stale = await save(meal, 104, 1, 'update');
        assert.equal(stale.ok, false);
        assert.equal(stale.current.detail.nutrition, null);
        assert.equal(
          (await db.query('select count(*)::int as n from event_nutrition')).rows[0].n,
          0,
        );
      },
    );
    const checkin = {
      ...meal,
      id: id(20),
      event_type: 'checkin',
      note: null,
      detail: {
        local_day: '2025-01-02',
        timezone_at_entry: 'Asia/Jakarta',
        state: 'completed',
        overall: 'not_answered',
        feeding_vs_usual: 'not_answered',
        wet_diapers_vs_usual: 'not_answered',
        sleep_concern: 'not_answered',
        new_symptoms: 'not_answered',
        parent_concern: null,
      },
    };
    await t.test(
      'daily check-ins preserve skipped observations, enforce dates and one per baby/day',
      async () => {
        assert.equal((await save(checkin, 120)).event.detail.new_symptoms, 'not_answered');
        await assert.rejects(save({ ...checkin, id: id(21) }, 121), /validation/);
        await assert.rejects(
          save(
            { ...checkin, id: id(22), detail: { ...checkin.detail, local_day: '2025-01-01' } },
            122,
          ),
          /validation/,
        );
        await assert.rejects(
          save(
            {
              ...checkin,
              id: id(22),
              detail: { ...checkin.detail, timezone_at_entry: 'Invalid/Zone' },
            },
            122,
          ),
          /invalid_timezone/,
        );
        const [a, b] = await Promise.all([
          save({ ...checkin, detail: { ...checkin.detail, overall: 'usual' } }, 123, 1, 'update'),
          save(
            { ...checkin, detail: { ...checkin.detail, overall: 'different' } },
            124,
            1,
            'update',
          ),
        ]);
        assert.equal([a, b].filter((r) => r.ok).length, 1);
        assert.equal([a, b].filter((r) => !r.ok && r.kind === 'conflict').length, 1);
      },
    );
    await t.test(
      'measurements reject empty data and bottle nutrition requires measured consumed volume',
      async () => {
        const growth = {
          ...meal,
          id: id(30),
          event_type: 'measurement',
          detail: { weight_kg: 4.2, length_cm: 54, head_cm: null },
        };
        assert.equal((await save(growth, 130)).event.detail.weight_kg, 4.2);
        await assert.rejects(
          save(
            { ...growth, id: id(31), detail: { weight_kg: null, length_cm: null, head_cm: null } },
            131,
          ),
        );
        const bottle = {
          ...meal,
          id: id(40),
          event_type: 'feeding',
          detail: {
            feeding_kind: 'formula_bottle',
            breast_side: null,
            volume_offered_ml: 100,
            volume_consumed_ml: 80,
            nutrition,
          },
        };
        assert.equal((await save(bottle, 140)).event.detail.nutrition.protein_g, 2.5);
        await assert.rejects(
          save(
            {
              ...bottle,
              id: id(41),
              detail: {
                ...bottle.detail,
                feeding_kind: 'direct_breast',
                volume_offered_ml: null,
                volume_consumed_ml: null,
              },
            },
            141,
          ),
          /validation/,
        );
      },
    );
    await t.test(
      'quota is durable, scoped to actor/day, denies unrelated babies and cannot be reset through table access',
      async () => {
        await as(1);
        const claimed = await Promise.all(
          Array.from({ length: 6 }, () => rpc('claim_report_request', [baby.id])),
        );
        assert.equal(claimed.filter(Boolean).length, 5);
        await assert.rejects(db.query('select * from report_limits'), /permission denied/);
        await as(2);
        assert.equal(await rpc('claim_report_request', [baby.id]), true);
        await as(4);
        await assert.rejects(rpc('claim_report_request', [baby.id]), /unauthorized/);
      },
    );
  } finally {
    await db.close();
  }
});
