import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SqlDriver, Mutation } from '../src/data/local/repository.ts';
import { LocalRepository } from '../src/data/local/repository.ts';
import { SyncWorker } from '../src/data/sync/worker.ts';
import type { SavedEvent, CareEvent, Baby } from '../src/domain/events.ts';
const owner = '40000000-0000-4000-8000-000000000001';
const baby: Baby = {
  id: '40000000-0000-4000-8000-000000000002',
  nickname: 'Synthetic',
  date_of_birth: '2025-01-01',
  timezone: 'Asia/Jakarta',
  gestation_weeks: null,
  gestation_days: null,
  growth_reference_sex: null,
  role: 'owner',
};
const uuid = (n) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date('2026-01-02T04:00:00Z');
const feed = (n = 10): CareEvent => ({
  id: uuid(n),
  baby_id: baby.id,
  event_type: 'feeding',
  occurred_at: '2026-01-02T03:00:00Z',
  ended_at: null,
  note: null,
  detail: {
    feeding_kind: 'direct_breast',
    breast_side: null,
    volume_offered_ml: null,
    volume_consumed_ml: null,
  },
});
function driver(db: DatabaseSync): SqlDriver {
  const sql: SqlDriver = {
    exec: async (query) => {
      db.exec(query);
    },
    run: async (query, ...params) => {
      db.prepare(query).run(...params);
    },
    all: async <T>(query: string, ...params: (string | number | null)[]) =>
      db.prepare(query).all(...params) as T[],
    transaction: async (work) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await work(sql);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return sql;
}
const accepted = (m: Mutation, version = 1): SavedEvent => ({
  ...m.payload,
  recorded_by: owner,
  server_version: version,
  deleted_at: m.operation === 'delete' ? now.toISOString() : null,
  sync_status: 'synced',
});
test('food and daily check-ins survive offline reopen with their original expected versions and account scope', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'babybloom-journal-test-'));
  const file = join(folder, 'journal.db');
  let db = new DatabaseSync(file);
  try {
    let local = new LocalRepository(driver(db), owner);
    await local.initialize();
    await local.setBabies([baby]);
    const meal: CareEvent = {
      ...feed(),
      event_type: 'meal',
      detail: {
        food_name: 'Synthetic meal',
        ingredients: 'Synthetic ingredients',
        portion_offered: 60,
        portion_consumed: 40,
        portion_unit: 'g',
        texture: 'puree',
        first_exposure: 'yes',
        reaction: 'not_observed',
        nutrition: {
          source: 'Synthetic label',
          calories_kcal: 25,
          protein_g: 1,
          carbs_g: null,
          fat_g: 0,
          fiber_g: null,
          iron_mg: null,
          calcium_mg: null,
        },
      },
    };
    await local.save(meal, uuid(100), 'create', false, now);
    const checkin: CareEvent = {
      ...feed(11),
      event_type: 'checkin',
      detail: {
        local_day: '2026-01-02',
        timezone_at_entry: baby.timezone,
        state: 'completed',
        overall: 'usual',
        feeding_vs_usual: 'not_answered',
        wet_diapers_vs_usual: 'not_answered',
        sleep_concern: 'not_answered',
        new_symptoms: 'not_answered',
        parent_concern: null,
      },
    };
    await local.save(checkin, uuid(101), 'create', false, now);
    db.close();
    db = new DatabaseSync(file);
    local = new LocalRepository(driver(db), owner);
    await local.initialize();
    assert.equal((await local.pending()).length, 2);
    const entries = await local.events(baby.id);
    assert.deepEqual(entries.find((e) => e.event_type === 'meal')?.detail, meal.detail);
    assert.deepEqual(entries.find((e) => e.event_type === 'checkin')?.detail, checkin.detail);
    assert.ok(
      (await local.pending()).every((m) => m.expected_version === 0 && m.status === 'queued'),
    );
    const unrelated = new LocalRepository(driver(db), uuid(3));
    await unrelated.initialize();
    assert.deepEqual(await unrelated.events(baby.id), []);
  } finally {
    db.close();
    await unlink(file);
  }
});
test('SQLite event+queue survive actual database close/reopen and recover syncing', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'babybloom-test-'));
  const file = join(folder, 'test.db');
  let db = new DatabaseSync(file);
  try {
    let local = new LocalRepository(driver(db), owner);
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await local.status((await local.pending())[0]!, 'syncing');
    db.close();
    db = new DatabaseSync(file);
    local = new LocalRepository(driver(db), owner);
    await local.initialize();
    assert.equal((await local.events(baby.id)).length, 1);
    assert.equal((await local.pending())[0]!.status, 'queued');
    const other = new LocalRepository(driver(db), uuid(3));
    await other.initialize();
    assert.deepEqual(await other.events(baby.id), []);
    assert.deepEqual(await other.pending(), []);
    assert.deepEqual(await other.babies(), []);
  } finally {
    db.close();
    await unlink(file);
  }
});
test('atomic rollback: failed queue insert cannot leave an unqueued event', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await assert.rejects(local.save(feed(11), uuid(100), 'create', false, now));
    assert.equal((await local.events(baby.id)).length, 1);
  } finally {
    db.close();
  }
});
test('chained offline create/edit/delete use ACK versions and never overwrite later local edit', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await local.save({ ...feed(), note: 'Later local' }, uuid(101), 'update', false, now);
    await local.save({ ...feed(), note: 'Later local' }, uuid(102), 'delete', false, now);
    const sent: Mutation[] = [];
    await new SyncWorker().run(
      local,
      {
        save: async (m) => {
          sent.push(m);
          return { ok: true, event: accepted(m, sent.length) };
        },
      },
      true,
      now,
    );
    assert.deepEqual(
      sent.map((m) => m.expected_version),
      [0, 1, 2],
    );
    assert.equal((await local.pending()).length, 0);
    assert.ok((await local.events(baby.id))[0]!.deleted_at);
  } finally {
    db.close();
  }
});
test('offline/transient errors remain durable, retry is bounded, other events can sync', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await local.save(feed(11), uuid(101), 'create', false, now);
    const worker = new SyncWorker();
    const remote = {
      save: async (m: Mutation) =>
        m.event_id === feed().id
          ? { ok: false as const, kind: 'retryable' as const }
          : { ok: true as const, event: accepted(m) },
    };
    await worker.run(local, remote, false, now);
    assert.equal((await local.events(baby.id))[0]!.sync_status, 'offline');
    await worker.run(local, remote, true, now, () => 0.5);
    const pending = (await local.pending())[0]!;
    assert.equal(pending.attempts, 1);
    assert.equal(pending.next_attempt, now.getTime() + 1000);
    assert.equal(
      (await local.events(baby.id)).find((e) => e.id === feed(11).id)!.sync_status,
      'synced',
    );
    await local.retry();
    assert.equal((await local.pending())[0]!.next_attempt, 0);
  } finally {
    db.close();
  }
});
test('conflict freezes following edits; explicit mine/server resolution and tombstone handling', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.merge({
      ...feed(),
      recorded_by: owner,
      server_version: 1,
      deleted_at: null,
      sync_status: 'synced',
    });
    await local.save({ ...feed(), note: 'Mine' }, uuid(100), 'update', false, now);
    const server = { ...accepted((await local.pending())[0]!, 2), note: 'Theirs' };
    await new SyncWorker().run(
      local,
      { save: async () => ({ ok: false, kind: 'conflict', current: server }) },
      true,
      now,
    );
    assert.equal((await local.events(baby.id))[0]!.note, 'Mine');
    assert.equal((await local.events(baby.id))[0]!.sync_status, 'conflict');
    await local.resolve(feed().id, 'mine', uuid(101));
    assert.equal((await local.pending())[0]!.expected_version, 2);
    await local.conflict((await local.pending())[0]!, { ...server, deleted_at: now.toISOString() });
    await assert.rejects(local.resolve(feed().id, 'mine', uuid(102)), /deleted_on_server/);
    await local.resolve(feed().id, 'server', uuid(103));
    assert.ok((await local.events(baby.id))[0]!.deleted_at);
    assert.equal((await local.pending()).length, 0);
  } finally {
    db.close();
  }
});
test('revocation purges baby, queued logs and conflicts; viewer cannot log', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await new SyncWorker().run(
      local,
      { save: async () => ({ ok: false, kind: 'unauthorized' }) },
      true,
      now,
    );
    assert.deepEqual(await local.events(baby.id), []);
    assert.deepEqual(await local.babies(), []);
    await local.setBabies([{ ...baby, role: 'viewer' }]);
    await assert.rejects(local.save(feed(11), uuid(101), 'create', false, now), /unauthorized/);
  } finally {
    db.close();
  }
});
test('one active sleep per baby locally, ending it persists through queue', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    const sleep: CareEvent = {
      ...feed(),
      event_type: 'sleep',
      detail: { sleep_kind: null, interruptions_count: null },
    };
    await local.save(sleep, uuid(100), 'create', false, now);
    await assert.rejects(
      local.save({ ...sleep, id: uuid(11) }, uuid(101), 'create', false, now),
      /active_sleep_conflict/,
    );
    await local.save({ ...sleep, ended_at: now.toISOString() }, uuid(102), 'update', false, now);
    await local.save({ ...sleep, id: uuid(11) }, uuid(103), 'create', false, now);
    assert.equal((await local.events(baby.id)).filter((e) => !e.ended_at).length, 1);
  } finally {
    db.close();
  }
});
test('a stale open form retains its original expected version after a newer pull', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.merge({
      ...feed(),
      recorded_by: owner,
      server_version: 2,
      deleted_at: null,
      sync_status: 'synced',
    });
    await local.save(
      { ...feed(), note: 'Draft opened at version 1' },
      uuid(100),
      'update',
      false,
      now,
      1,
    );
    assert.equal((await local.pending())[0]!.expected_version, 1);
  } finally {
    db.close();
  }
});
test('repairing a definitively rejected create uses a fresh idempotency key and repaired payload', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await local.status((await local.pending())[0]!, 'error', 0, 'validation');
    await local.save({ ...feed(), note: 'Repaired' }, uuid(101), 'update', false, now);
    const queued = await local.pending();
    assert.equal(queued.length, 1);
    assert.equal(queued[0]!.operation, 'create');
    assert.equal(queued[0]!.mutation_id, uuid(101));
    assert.equal(queued[0]!.payload.note, 'Repaired');
  } finally {
    db.close();
  }
});
test('duplicate acknowledgement and stale pull never move an accepted version backward', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    const mutation = (await local.pending())[0]!;
    await local.acknowledge(mutation, accepted(mutation, 1));
    await local.merge({ ...accepted(mutation, 3), note: 'Newer' });
    await local.acknowledge(mutation, accepted(mutation, 1));
    await local.merge(accepted(mutation, 2));
    assert.equal((await local.events(baby.id))[0]!.server_version, 3);
    assert.equal((await local.events(baby.id))[0]!.note, 'Newer');
  } finally {
    db.close();
  }
});
test('delta-sync cursors are account scoped and purged with revoked access', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.setPullCursor(baby.id, now.toISOString());
    assert.equal(await local.pullCursor(baby.id), now.toISOString());
    const other = new LocalRepository(driver(db), uuid(3));
    assert.equal(await other.pullCursor(baby.id), null);
    await local.setBabies([]);
    assert.equal(await local.pullCursor(baby.id), null);
  } finally {
    db.close();
  }
});
test('lost ACK replay cannot rebase queued edits over another caregiver, and preserves deletion conflict', async () => {
  const db = new DatabaseSync(':memory:');
  const local = new LocalRepository(driver(db), owner);
  try {
    await local.initialize();
    await local.setBabies([baby]);
    await local.save(feed(), uuid(100), 'create', false, now);
    await local.save({ ...feed(), note: 'Offline draft' }, uuid(101), 'update', false, now);
    const first = (await local.pending())[0]!;
    await local.acknowledge(first, { ...accepted(first, 3), note: 'Another caregiver' }, 1);
    assert.equal((await local.pending())[0]!.expected_version, 1);
    assert.equal((await local.events(baby.id))[0]!.note, 'Offline draft');
    await local.save({ ...feed(), note: 'More local details' }, uuid(102), 'update', false, now);
    const pending = (await local.pending())[0]!;
    await local.acknowledge(pending, { ...accepted(pending, 4), deleted_at: now.toISOString() }, 2);
    assert.equal((await local.events(baby.id))[0]!.note, 'More local details');
    assert.equal((await local.events(baby.id))[0]!.sync_status, 'conflict');
    assert.ok((await local.serverConflict(feed().id))!.deleted_at);
  } finally {
    db.close();
  }
});
