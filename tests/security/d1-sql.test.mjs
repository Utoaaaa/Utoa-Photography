import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { root, sourceLoader } from './source-loader.mjs';

// Runs the handwritten D1 SQL against the schema the Prisma migrations actually create,
// through a D1-shaped adapter that enforces D1's 100 bound-parameter limit.
function migratedDatabase() {
  const db = new DatabaseSync(':memory:');
  const dir = path.join(root, 'prisma/migrations');
  for (const name of fs.readdirSync(dir).filter((entry) => /^\d+_/.test(entry)).sort()) {
    db.exec(fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8'));
  }
  return db;
}

function d1(db) {
  const prepared = [];
  const statement = (sql, values = []) => ({
    bind(...next) {
      if (next.length > 100) throw new Error('D1_ERROR: too many SQL variables');
      return statement(sql, next);
    },
    run: async () => { db.prepare(sql).run(...values); return { success: true }; },
    first: async () => db.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...values) }),
  });
  return {
    prepared,
    prepare(sql) { prepared.push(sql); return statement(sql); },
    batch: async (statements) => Promise.all(statements.map((item) => item.all())),
  };
}

test('d1CreateAuditLog writes a row the audit_logs schema accepts', async () => {
  const db = migratedDatabase();
  const load = sourceLoader({ env: {}, overrides: { './cloudflare': { getD1Database: () => d1(db) } } });
  const { d1CreateAuditLog } = load('src/lib/d1-queries.ts');
  await d1CreateAuditLog({ actor: 'admin@example.invalid', actor_type: 'user', entity_type: 'year', entity_id: 'y1', action: 'edit', meta: '{}' });
  const rows = db.prepare('SELECT id, actor, entity_id, timestamp FROM audit_logs').all();
  assert.equal(rows.length, 1);
  assert.match(rows[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(rows[0].entity_id, 'y1');
  assert.ok(rows[0].timestamp);
});

test('findAssetCoversD1 reports collection and location covers', async () => {
  const db = migratedDatabase();
  db.exec(`
    INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES ('y1', '2026', '1', 'published', 0, 0);
    INSERT INTO locations (id, year_id, slug, name, cover_asset_id, order_index, created_at, updated_at)
      VALUES ('loc1', 'y1', 'nz', 'NZ', 'cover-asset', '1', 0, 0);
    INSERT INTO collections (id, year_id, slug, title, cover_asset_id, status, order_index, created_at, updated_at)
      VALUES ('c1', 'y1', 'night', 'Night', 'cover-asset', 'published', '1', 0, 0);
  `);
  const { findAssetCoversD1 } = sourceLoader({ env: {} })('src/lib/asset-references.ts');
  const covers = await findAssetCoversD1(d1(db), 'cover-asset');
  assert.deepEqual(covers.map((cover) => `${cover.kind}:${cover.id}`).sort(), ['collection:c1', 'location:loc1']);
  assert.equal((await findAssetCoversD1(d1(db), 'other-asset')).length, 0);
});

test('selectIn stays under the D1 parameter limit and returns every matching row', async () => {
  const db = migratedDatabase();
  const insert = db.prepare("INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES (?, ?, ?, 'published', 0, 0)");
  const ids = Array.from({ length: 250 }, (_, index) => `year-${index}`);
  for (const id of ids.slice(0, 120)) insert.run(id, id, '1');
  const adapter = d1(db);
  const { selectIn } = sourceLoader({ env: {} })('src/lib/d1/select-in.ts');
  const rows = await selectIn(adapter, (placeholders) => `SELECT id FROM years WHERE id IN (${placeholders})`, ids);
  assert.equal(adapter.prepared.length, 3);
  assert.equal(rows.length, 120);
  assert.equal((await selectIn(adapter, () => 'unused', [])).length, 0);
});
