import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sqliteDriver } from '../src/data/local/sqlite-driver.ts';
import { payloadCipher } from '../src/data/local/payload-cipher.ts';
import { en, id } from '../src/lib/i18n.ts';
import { features, clinicalContent } from '../src/domain/features.ts';
test('browser payload encryption uses unique nonces, decrypts Unicode, and rejects tampering', async () => {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const cipher = payloadCipher(key);
  const content = JSON.stringify({ note: 'Synthetic catatan 🌱' });
  const a = await cipher.encrypt(content),
    b = await cipher.encrypt(content);
  assert.notEqual(a, b);
  assert.ok(!a.includes('catatan'));
  assert.equal(await cipher.decrypt(a), content);
  const parts = a.split(':');
  parts[2] = (parts[2]![0] === 'A' ? 'B' : 'A') + parts[2]!.slice(1);
  await assert.rejects(cipher.decrypt(parts.join(':')));
  await assert.rejects(cipher.decrypt(content));
  await assert.rejects(crypto.subtle.exportKey('raw', key));
});
test('driver serializes concurrent transactions on one connection and rolls back atomically', async () => {
  const db = new DatabaseSync(':memory:');
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const driver = sqliteDriver(
    {
      execAsync: async (query) => {
        db.exec(query);
      },
      runAsync: async (query, ...params) => db.prepare(query).run(...params),
      getAllAsync: async <T>(query: string, ...params: (string | number | null)[]) =>
        db.prepare(query).all(...params) as T[],
      withTransactionAsync: async (work) => {
        db.exec('BEGIN');
        try {
          await work();
          db.exec('COMMIT');
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    },
    payloadCipher(key),
  );
  try {
    await driver.exec('CREATE TABLE data(id TEXT PRIMARY KEY,payload TEXT NOT NULL)');
    const results = await Promise.allSettled([
      driver.transaction(async (tx) => {
        await tx.run('INSERT INTO data VALUES(?,?)', 'a', '{"note":"synthetic secret"}');
        await Promise.resolve();
        throw new Error('rollback');
      }),
      driver.transaction(async (tx) => {
        await tx.run('INSERT INTO data VALUES(?,?)', 'b', '{"note":"retained"}');
      }),
    ]);
    assert.equal(results[0]!.status, 'rejected');
    assert.equal(results[1]!.status, 'fulfilled');
    const rows = await driver.all<{
      id: string;
      payload: string;
    }>('SELECT * FROM data');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, 'b');
    assert.equal(rows[0]!.payload, '{"note":"retained"}');
    assert.ok(
      !(db.prepare('SELECT payload FROM data').get()!.payload as string).includes('retained'),
    );
  } finally {
    db.close();
  }
});
test('bilingual copy has complete parity and unreviewed clinical features remain disabled', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
  assert.ok(Object.values(en).every((value) => value.length > 0));
  assert.equal(features.growthPercentiles, false);
  assert.equal(features.personalizedClinicalRules, false);
  assert.equal(clinicalContent.reviewStatus, 'REQUIRES_REVIEW');
  assert.equal(clinicalContent.enabled, false);
  for (const dictionary of [id, en]) {
    assert.ok(dictionary.safety_body.length > 0);
    assert.ok(dictionary.disclaimer.length > 0);
  }
});
