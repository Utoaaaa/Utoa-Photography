import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sourceLoader } from '../security/source-loader.mjs';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE years(id TEXT PRIMARY KEY,label TEXT);
    CREATE TABLE locations(id TEXT PRIMARY KEY,year_id TEXT,slug TEXT,name TEXT,summary TEXT);
    CREATE TABLE collections(id TEXT PRIMARY KEY,year_id TEXT,location_id TEXT,slug TEXT,title TEXT,summary TEXT);
    CREATE TABLE assets(id TEXT PRIMARY KEY,alt TEXT,created_at TEXT);
    CREATE TABLE seo_metadata(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,title TEXT,description TEXT,
      og_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,canonical_url TEXT,updated_at TEXT,UNIQUE(entity_type,entity_id));
    CREATE TABLE audit_logs(id TEXT PRIMARY KEY,actor TEXT,actor_type TEXT,entity_type TEXT,entity_id TEXT,action TEXT,timestamp TEXT,meta TEXT);
    INSERT INTO years VALUES('y','2026');
    INSERT INTO locations VALUES('l','y','coast','展示地點','展示地點簡介');
    INSERT INTO collections VALUES('c','y','l','light','展示作品名稱','展示作品簡介');
    INSERT INTO assets VALUES('a','測試照片','2026-01-01');`);
  const execute = (sql, values) => db.prepare(sql).run(...values);
  const d1 = {
    prepare(sql) {
      return { bind(...values) {
        return { sql, values, all: async () => ({ results: db.prepare(sql).all(...values) }) };
      } };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { for (const s of statements) execute(s.sql, s.values); db.exec('COMMIT'); }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
  const effects = [];
  const load = sourceLoader({ env: { NODE_ENV: 'production' }, effects, overrides: {
    '@/lib/d1-queries': { shouldUseD1Direct: () => true },
    '@/lib/cloudflare': { getD1Database: () => d1 },
    '@/lib/auth': { adminAuthError: async () => null },
    'next/cache': { revalidatePath: value => effects.push(value) },
  } });
  return { db, load, effects, store: load('src/lib/seo/store.ts') };
}

for (const type of ['homepage','location','collection']) {
  test(`${type}: saves SEO independently, outputs metadata, and clears back to defaults`, async () => {
    const f = fixture();
    try {
      const id = { homepage:'homepage', location:'l', collection:'c' }[type];
      const before = f.db.prepare('SELECT * FROM collections').all();
      const beforeLocations = f.db.prepare('SELECT * FROM locations').all();
      const target = await f.store.getSEOTarget(type,id);
      assert.ok(target);
      const fields = { title:'搜尋標題 <測試>', description:'搜尋專用描述，不是畫面簡介', og_asset_id:'a' };
      await f.store.saveSEO(type,id,fields);
      const editor = await f.store.getSEOEditor(target);
      assert.equal(editor.fields.title,fields.title);
      assert.equal(editor.images[0].id,'a');
      const output = await f.store.getPageSEO(type,id,{title:target.defaultTitle,description:target.defaultDescription},target.path);
      assert.equal(output.title,fields.title);
      assert.equal(output.description,fields.description);
      assert.equal(output.openGraph.title,fields.title);
      assert.equal(output.twitter.description,fields.description);
      assert.equal(output.openGraph.images[0].url,'https://images.utoa.studio/images/a/large.webp');
      assert.equal(output.alternates.canonical,`https://utoa.studio${target.path}`);
      assert.deepEqual(f.db.prepare('SELECT * FROM collections').all(),before);
      assert.deepEqual(f.db.prepare('SELECT * FROM locations').all(),beforeLocations);
      assert.equal(f.db.prepare('SELECT count(*) AS n FROM audit_logs').get().n,1);
      await f.store.saveSEO(type,id,{title:null,description:null,og_asset_id:null});
      const cleared = await f.store.getPageSEO(type,id,{title:target.defaultTitle,description:target.defaultDescription},target.path);
      assert.equal(cleared.title,target.defaultTitle);
      assert.equal(cleared.openGraph.images[0].url,'https://utoa.studio/assets/og-camera.svg');
      assert.equal(f.db.prepare('SELECT count(*) AS n FROM seo_metadata').get().n,1);
    } finally { f.db.close(); }
  });
}

test('SEO and audit write roll back together on D1 failure', async () => {
  const f = fixture();
  try {
    f.db.exec('DROP TABLE audit_logs');
    await assert.rejects(f.store.saveSEO('homepage','homepage',{title:'x',description:null,og_asset_id:null}));
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM seo_metadata').get().n,0);
  } finally { f.db.close(); }
});

test('API validates targets and fields, prevents visible-content writes, and refreshes canonical path', async () => {
  const f = fixture();
  try {
    const route = f.load('src/app/api/admin/seo/[entityType]/[entityId]/route.ts');
    const ctx = (entityType='collection',entityId='c') => ({params:Promise.resolve({entityType,entityId})});
    const put = body => new Request('https://utoa.studio/api/admin/seo/collection/c',{method:'PUT',body:JSON.stringify(body)});
    const fields = {title:'SEO only',description:'Description',og_asset_id:'a'};
    for (const body of [{...fields,summary:'oops'}, {...fields,title:'x'.repeat(201)}, {...fields,og_asset_id:'missing'}, {title:'partial'}]) {
      assert.equal((await route.PUT(put(body),ctx())).status,400);
    }
    assert.equal((await route.PUT(put(fields),ctx('homepage','bad'))).status,400);
    assert.equal((await route.PUT(put(fields),ctx('collection','missing'))).status,404);
    assert.equal((await route.PUT(put(fields),ctx())).status,200);
    assert.ok(f.effects.includes('/2026/coast/light'));
    const response = await route.GET(new Request('https://utoa.studio/api/admin/seo/collection/c'),ctx());
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await response.json()).fields.title,'SEO only');
    assert.equal(f.db.prepare('SELECT title FROM collections').get().title,'展示作品名稱');
    assert.equal((await route.PUT(put({title:'   ',description:'',og_asset_id:''}),ctx())).status,200);
    assert.equal(f.db.prepare('SELECT title FROM seo_metadata').get().title,null);
  } finally { f.db.close(); }
});
