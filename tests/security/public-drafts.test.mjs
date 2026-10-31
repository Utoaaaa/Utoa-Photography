import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { sourceLoader } from './source-loader.mjs';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const env = { NODE_ENV: 'production' };
const d1 = { shouldUseD1Direct: () => true };
const get = pathname => new NextRequest(`https://utoa.studio${pathname}`, { method: 'GET' });
const context = params => ({ params: Promise.resolve(params) });

// Anonymous endpoints must never expose drafts, whatever the query string asks for.
test('public years list asks only for published years', async () => {
  const statuses = [];
  const load = sourceLoader({ env, jose: {}, overrides: {
    '@/lib/d1-queries': { ...d1, d1GetYears: async ({ status }) => { statuses.push(status); return []; } },
  } });
  const { GET } = load('src/app/api/years/route.ts');
  for (const status of ['draft', 'all', 'published']) {
    assert.equal((await GET(get(`/api/years?status=${status}`))).status, 200);
  }
  assert.deepEqual(statuses, ['published', 'published', 'published']);
});

test('public year detail answers 404 for draft years', async () => {
  const year = { id: 'y1', label: '2026', status: 'draft' };
  const load = sourceLoader({ env, jose: {}, overrides: {
    '@/lib/d1-queries': d1,
    '@/lib/d1/location-service': { d1FindYearByIdentifier: async () => year },
  } });
  const { GET } = load('src/app/api/years/[year_id]/route.ts');
  const call = () => GET(get('/api/years/y1'), context({ year_id: 'y1' }));
  assert.equal((await call()).status, 404);
  year.status = 'published';
  assert.equal((await call()).status, 200);
});

test('public year collections list only published collections of published years', async () => {
  const year = { id: 'y1', status: 'draft' };
  const statuses = [];
  const load = sourceLoader({ env, jose: {}, overrides: {
    '@/lib/d1-queries': d1,
    '@/lib/d1/location-service': { d1FindYearByIdentifier: async () => year },
    '@/lib/d1/collection-service': { d1ListCollectionsForYear: async ({ status }) => { statuses.push(status); return []; } },
  } });
  const { GET } = load('src/app/api/years/[year_id]/collections/route.ts');
  const call = () => GET(get('/api/years/y1/collections?status=draft'), context({ year_id: 'y1' }));
  assert.equal((await call()).status, 404);
  year.status = 'published';
  assert.equal((await call()).status, 200);
  assert.deepEqual(statuses, ['published']);
});

test('public collection detail hides drafts and collections of draft years', async () => {
  const row = { id: 'c1', year_id: 'y1', slug: 'night', title: 'Night', status: 'draft', year_status: 'published' };
  const db = { prepare: sql => ({ bind: () => ({
    first: async () => (sql.includes('COUNT(*)') ? { count: 0 } : { ...row }),
    all: async () => ({ results: [] }),
  }) }) };
  const load = sourceLoader({ env, jose: {}, overrides: { '@/lib/d1-queries': d1, '@/lib/cloudflare': { getD1Database: () => db } } });
  const { GET } = load('src/app/api/collections/[collection_id]/route.ts');
  const call = () => GET(get('/api/collections/c1?include_assets=true'), context({ collection_id: 'c1' }));
  assert.equal((await call()).status, 404);
  Object.assign(row, { status: 'published', year_status: 'draft' });
  assert.equal((await call()).status, 404);
  row.year_status = 'published';
  assert.equal((await call()).status, 200);
});

test('site viewer queries require both the collection and its year to be published', async () => {
  const statements = [];
  const db = {
    prepare: sql => { statements.push(sql); return { bind: () => ({ first: async () => null }) }; },
  };
  const load = sourceLoader({ env, overrides: {
    '@/lib/d1-queries': d1,
    '@/lib/cloudflare': { getD1Database: () => db },
  } });
  const viewer = load('src/lib/viewer/collection.ts');
  assert.equal(await viewer.fetchCollectionForViewer({ yearLabel: '2026', slug: 'night' }), null);
  assert.equal(await viewer.fetchCollectionByIdForViewer('c1'), null);
  assert.equal(statements.length, 2);
  for (const sql of statements) assert.match(sql, /c\.status = 'published' AND y\.status = 'published'/);
});
