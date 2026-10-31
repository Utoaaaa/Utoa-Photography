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

test('the public year/location tree loads in one batch and is shared by every lookup', async () => {
  const db = migratedDatabase();
  db.exec(`
    INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES
      ('y25', '2025', '000002', 'published', 0, 0),
      ('y26', '2026', '000001', 'published', 0, 0),
      ('ydraft', '2027', '000003', 'draft', 0, 0);
    INSERT INTO assets (id, alt, width, height, updated_at) VALUES ('cover', 'c', 1200, 800, 0), ('p1', 'p', 10, 10, 0);
    INSERT INTO locations (id, year_id, slug, name, cover_asset_id, order_index, created_at, updated_at) VALUES
      ('l10', 'y26', 'ten', 'Ten', 'cover', '10.0', 0, 0),
      ('l9', 'y26', 'nine', 'Nine', NULL, '9.0', 0, 0),
      ('lhidden', 'ydraft', 'hidden', 'Hidden', NULL, '1.0', 0, 0);
    INSERT INTO collections (id, year_id, location_id, slug, title, status, order_index, updated_at) VALUES
      ('c-food', 'y26', 'l10', 'food', 'Food', 'published', '1.0', 0),
      ('c-late', 'y26', 'l10', 'late', 'Late', 'published', '000017', 0),
      ('c-draft', 'y26', 'l10', 'draft', 'Draft', 'draft', '000002', 0),
      ('c-hidden', 'ydraft', 'lhidden', 'secret', 'Secret', 'published', '1', 0);
    INSERT INTO collection_assets (collection_id, asset_id, order_index) VALUES ('c-late', 'p1', '1');
  `);
  const adapter = d1(db);
  let batches = 0;
  const batch = adapter.batch;
  adapter.batch = (statements) => { batches++; return batch(statements); };
  // Per-request memoisation, like React cache() on the server.
  const memo = (fn) => { const results = new Map(); return (...args) => {
    const key = JSON.stringify(args);
    if (!results.has(key)) results.set(key, fn(...args));
    return results.get(key);
  }; };
  const load = sourceLoader({ env: { NODE_ENV: 'production' }, overrides: {
    react: { cache: memo },
    './d1-queries': { shouldUseD1Direct: () => true },
    './cloudflare': { getD1Database: () => adapter },
  } });
  const tree = load('src/lib/year-location.ts');

  const { years } = await tree.loadYearLocationData();
  // Arrays come from the loader's VM realm, so compare joined strings.
  assert.equal(years.map((year) => year.label).join(), '2026,2025');
  const [y26] = years;
  assert.equal(y26.locations.map((location) => location.slug).join(), 'nine,ten');
  const ten = y26.locations[1];
  assert.equal(ten.coverAssetWidth, 1200);
  assert.equal(ten.collections.map((c) => `${c.slug}:${c.photoCount}`).join(), 'food:0,late:1');

  assert.equal((await tree.loadYearLocationNavData()).map((year) => year.locations.length).join(), '2,0');
  assert.equal((await tree.getLocationByYearAndSlugCached('2026', 'ten')).location.id, 'l10');
  assert.equal(await tree.getLocationByYearAndSlug('2027', 'hidden'), null);
  assert.equal((await tree.getYearByLabel('2025')).id, 'y25');
  assert.equal(await tree.getYearByLabel('2027'), null);
  assert.equal(batches, 1);
  assert.equal(adapter.prepared.length, 3);
});

test('the collection viewer returns a published collection and its photos in one batch', async () => {
  const db = migratedDatabase();
  db.exec(`
    INSERT INTO years (id, label, order_index, status, created_at, updated_at) VALUES ('y26', '2026', '1', 'published', 0, 0);
    INSERT INTO locations (id, year_id, slug, name, order_index, created_at, updated_at) VALUES ('l1', 'y26', 'nz', 'NZ', '1.0', 0, 0);
    INSERT INTO assets (id, alt, width, height, updated_at) VALUES ('p1', 'one', 10, 10, 0), ('p2', 'two', 20, 20, 0);
    INSERT INTO collections (id, year_id, location_id, slug, title, status, order_index, updated_at) VALUES
      ('c1', 'y26', 'l1', 'night', 'Night', 'published', '1', 0),
      ('c2', 'y26', 'l1', 'secret', 'Secret', 'draft', '2', 0);
    INSERT INTO collection_assets (collection_id, asset_id, order_index) VALUES ('c1', 'p2', '10'), ('c1', 'p1', '9'), ('c2', 'p1', '1');
  `);
  const adapter = d1(db);
  const viewer = sourceLoader({ env: { NODE_ENV: 'production' }, overrides: {
    react: { cache: (fn) => fn },
    '@/lib/d1-queries': { shouldUseD1Direct: () => true },
    '@/lib/cloudflare': { getD1Database: () => adapter },
  } })('src/lib/viewer/collection.ts');

  const night = await viewer.fetchCollectionForViewer({ yearLabel: '2026', slug: 'night' });
  assert.equal(night.location.slug, 'nz');
  assert.equal(night.photos.map((photo) => photo.alt).join(), 'one,two');
  assert.equal((await viewer.fetchCollectionByIdForViewer('c1')).collection.slug, 'night');
  assert.equal(await viewer.fetchCollectionForViewer({ yearLabel: '2026', slug: 'secret' }), null);
  assert.equal(await viewer.fetchCollectionByIdForViewer('c2'), null);
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
