import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const { PGlite } = await import('@electric-sql/pglite').catch(
  () => import('../.tooling/node_modules/@electric-sql/pglite/dist/index.js'),
);
const users = {
  owner: '10000000-0000-4000-8000-000000000001',
  editor: '10000000-0000-4000-8000-000000000002',
  viewer: '10000000-0000-4000-8000-000000000003',
  outsider: '10000000-0000-4000-8000-000000000004',
};
const id = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('PostgreSQL migrations, RLS, transactional mutations, and concurrency contracts', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role anon nologin; create role authenticated nologin;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    // Match Supabase's permissive default ACLs, then prove migrations revoke them.
    await db.exec(
      'alter default privileges in schema public grant all on tables to anon,authenticated; alter default privileges in schema public grant execute on functions to anon,authenticated;',
    );
    for (const u of Object.values(users)) await db.query('insert into auth.users values ($1)', [u]);
    for (const file of (
      await readdir(new URL('../supabase/migrations/', import.meta.url))
    ).sort()) {
      await db.exec(
        await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'),
      );
    }
    const as = async (user) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[user]]);
      await db.exec('set role authenticated');
    };
    const rpc = async (name, values) =>
      (
        await db.query(
          `select public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) as result`,
          values,
        )
      ).rows[0].result;
    const input = {
      nickname: 'Synthetic Sprout',
      date_of_birth: '2024-01-01',
      timezone: 'Asia/Jakarta',
      gestation_weeks: null,
      gestation_days: null,
      growth_reference_sex: null,
      guardian_confirmed: true,
      policy_version: '2026-10-draft',
    };
    await as('owner');
    const baby = await rpc('create_baby', [input]);
    const feed = (n) => ({
      id: id(n),
      baby_id: baby.id,
      event_type: 'feeding',
      occurred_at: '2025-01-01T04:00:00Z',
      ended_at: null,
      note: null,
      detail: {
        feeding_kind: 'direct_breast',
        breast_side: null,
        volume_offered_ml: null,
        volume_consumed_ml: null,
      },
    });
    const save = (event, n, version = 0, op = 'create') =>
      rpc('save_care_event', [event, id(n), version, op, false]);
    await t.test('consent, timezone and unknown fields are validated', async () => {
      await assert.rejects(
        rpc('create_baby', [{ ...input, guardian_confirmed: false }]),
        /consent_required/,
      );
      await assert.rejects(
        rpc('create_baby', [{ ...input, timezone: 'not/a-zone' }]),
        /invalid_timezone/,
      );
      await assert.rejects(rpc('create_baby', [{ ...input, role: 'owner' }]), /validation/);
      assert.equal(
        (await db.query('select count(*)::int as n from guardian_consents')).rows[0].n,
        1,
      );
    });
    await t.test(
      'owner creates a typed event and duplicate mutation returns one event',
      async () => {
        assert.equal((await save(feed(1), 101)).event.recorded_by, users.owner);
        assert.equal((await save(feed(1), 101)).event.server_version, 1);
        assert.equal((await db.query('select count(*)::int as n from care_events')).rows[0].n, 1);
        assert.equal(
          (await db.query('select count(*)::int as n from feeding_details')).rows[0].n,
          1,
        );
      },
    );
    await db.exec('reset role');
    for (const [user, role] of [
      ['editor', 'editor'],
      ['viewer', 'viewer'],
    ])
      await db.query('insert into baby_memberships(baby_id,user_id,role) values($1,$2,$3)', [
        baby.id,
        users[user],
        role,
      ]);
    // Seed every foundation table as the trusted database owner for policy checks.
    await db.query(
      "insert into baby_invitations(baby_id,inviter_id,invitee_email_hash,role,token_digest,expires_at) values($1,$2,'synthetic-hash','editor','synthetic-digest',now()+interval '1 day')",
      [baby.id, users.owner],
    );
    await db.query(
      "insert into daily_checkins(baby_id,local_day,timezone_at_entry,state,recorded_by) values($1,'2025-01-01','Asia/Jakarta','draft',$2)",
      [baby.id, users.owner],
    );
    await as('owner');
    const dirty = {
      ...feed(2),
      event_type: 'diaper',
      detail: {
        diaper_kind: 'dirty',
        stool_color: null,
        stool_consistency: null,
        stool_amount: null,
        blood_seen: null,
        mucus_seen: null,
        urine_unusual: null,
        rash_present: null,
      },
    };
    const sleeping = {
      ...feed(3),
      event_type: 'sleep',
      detail: { sleep_kind: null, interruptions_count: null },
    };
    await save(dirty, 102);
    await save(sleeping, 103);
    await t.test('outsider cannot read any family envelope, join, or metadata', async () => {
      await as('outsider');
      for (const table of [
        'babies',
        'baby_memberships',
        'guardian_consents',
        'audit_events',
        'baby_invitations',
        'care_events',
        'feeding_details',
        'diaper_details',
        'sleep_details',
        'daily_checkins',
      ])
        assert.equal((await db.query(`select * from ${table}`)).rows.length, 0, table);
      await assert.rejects(rpc('list_events', [baby.id, null, null]), /unauthorized/);
      await assert.rejects(save(feed(4), 104), /unauthorized/);
      assert.deepEqual(await rpc('list_babies', []), []);
    });
    await t.test(
      'viewer can read and cannot write; direct membership escalation denied',
      async () => {
        await as('viewer');
        assert.equal((await db.query('select * from care_events')).rows.length, 3);
        await assert.rejects(save(feed(4), 104), /unauthorized/);
        await assert.rejects(
          db.query("update baby_memberships set role='owner' where user_id=$1", [users.viewer]),
          /permission denied/,
        );
        for (const table of [
          'babies',
          'guardian_consents',
          'audit_events',
          'baby_invitations',
          'care_events',
          'feeding_details',
          'diaper_details',
          'sleep_details',
          'daily_checkins',
          'mutation_receipts',
        ]) {
          await assert.rejects(db.exec(`delete from ${table}`), /permission denied/, table);
        }
      },
    );
    await t.test(
      'editor can edit with audit attribution, original recorder stays unchanged',
      async () => {
        await as('editor');
        const edit = { ...feed(1), note: 'Synthetic note' };
        assert.equal((await save(edit, 105, 1, 'update')).event.recorded_by, users.owner);
        await assert.rejects(
          db.query('delete from babies where id=$1', [baby.id]),
          /permission denied/,
        );
        const conflict = await save({ ...edit, note: 'Other edit' }, 106, 1, 'update');
        assert.equal(conflict.kind, 'conflict');
        assert.equal(conflict.current.server_version, 2);
        await as('owner');
        const replay = await save(feed(1), 101);
        assert.equal(replay.accepted_version, 1);
        assert.equal(replay.event.server_version, 2);
        await as('editor');
      },
    );
    await t.test('one active sleep per baby, including a second caregiver', async () => {
      await assert.rejects(save({ ...sleeping, id: id(4) }, 107), /active_sleep_conflict/);
      assert.equal(
        (await save({ ...sleeping, ended_at: '2025-01-01T05:00:00Z' }, 108, 1, 'update')).ok,
        true,
      );
    });
    await t.test(
      'transaction rolls back invalid details, durations, and impersonation',
      async () => {
        await as('owner');
        await assert.rejects(save({ ...feed(10), recorded_by: users.outsider }, 110), /validation/);
        await assert.rejects(
          save({ ...feed(11), detail: { ...feed(11).detail, volume_consumed_ml: 20 } }, 111),
          /check constraint/,
        );
        await assert.rejects(
          save({ ...feed(12), ended_at: '2024-01-01T00:00:00Z' }, 112),
          /check constraint/,
        );
        await assert.rejects(
          save(
            {
              ...feed(13),
              detail: {
                feeding_kind: 'formula_bottle',
                breast_side: null,
                volume_offered_ml: 5,
                volume_consumed_ml: 6,
              },
            },
            113,
          ),
          /check constraint/,
        );
        await assert.rejects(
          save(
            {
              ...feed(14),
              detail: {
                feeding_kind: 'formula_bottle',
                breast_side: null,
                volume_offered_ml: null,
                volume_consumed_ml: 1.11,
              },
            },
            114,
          ),
          /validation/,
        );
        assert.equal((await db.query('select count(*)::int as n from care_events')).rows[0].n, 3);
      },
    );
    await t.test(
      'delete tombstone survives old create replay and attempted resurrection',
      async () => {
        const deleted = await save(feed(1), 115, 2, 'delete');
        assert.ok(deleted.event.deleted_at);
        const replay = await save(feed(1), 101);
        assert.ok(replay.event.deleted_at);
        const resurrection = await save(feed(1), 116, 3, 'update');
        assert.equal(resurrection.kind, 'conflict');
        assert.ok(resurrection.current.deleted_at);
      },
    );
    await t.test('cross-family identity substitution and receipt reuse fail', async () => {
      await as('outsider');
      const other = await rpc('create_baby', [{ ...input, nickname: 'Synthetic Other' }]);
      await assert.rejects(save({ ...feed(1), baby_id: other.id }, 117), /validation/);
      await assert.rejects(save({ ...feed(20), baby_id: other.id }, 101), /validation/);
    });
    await t.test('revocation removes every read and RPC permission', async () => {
      await db.exec('reset role');
      await db.query(
        "update baby_memberships set status='revoked',revoked_at=now() where baby_id=$1 and user_id=$2",
        [baby.id, users.editor],
      );
      await as('editor');
      assert.equal((await db.query('select * from babies')).rows.length, 0);
      assert.equal((await db.query('select * from feeding_details')).rows.length, 0);
      await assert.rejects(save(feed(21), 121), /unauthorized/);
    });
    await t.test('all tables have RLS and audit payloads exclude free text', async () => {
      await db.exec('reset role');
      const rows = (
        await db.query(
          "select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'",
        )
      ).rows;
      assert.equal(rows.length, 12);
      assert.ok(rows.every((r) => r.relrowsecurity));
      assert.ok(
        (
          await db.query('select change_summary_safe::text as payload from audit_events')
        ).rows.every((r) => !r.payload.includes('Synthetic note')),
      );
      const audit = (
        await db.query('select actor_id from audit_events where request_id=$1', [id(105)])
      ).rows[0];
      assert.equal(audit.actor_id, users.editor);
    });
    await t.test(
      'anonymous and authenticated API roles cannot call the private JSON helper',
      async () => {
        await db.exec('set role anon');
        await assert.rejects(rpc('create_baby', [input]), /permission denied/);
        await assert.rejects(rpc('care_event_json', [id(1)]), /permission denied/);
        await as('outsider');
        await assert.rejects(rpc('care_event_json', [id(1)]), /permission denied/);
      },
    );
  } finally {
    await db.close();
  }
});
