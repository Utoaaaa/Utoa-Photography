import type { D1Database } from '@cloudflare/workers-types';
import { getD1Database } from '@/lib/cloudflare';
import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getImageUrl } from '@/lib/images';
import { getSiteUrl } from '@/lib/site-url';
import { buildPageMetadata, DEFAULT_SEO_IMAGE, EMPTY_SEO } from './metadata';
import type { SEOEntityType, SEOFields, SEOImage, SEOTarget, SEOEditorData } from './metadata';

async function query<T>(sql: string, values: string[] = []): Promise<T[]> {
  // All SQL is defined in this module. User input is bound, never interpolated.
  if (shouldUseD1Direct()) {
    const db = getD1Database() as D1Database;
    const result = await db.prepare(sql).bind(...values).all<T>();
    return result.results;
  }
  const { prisma } = await import('@/lib/db');
  return prisma.$queryRawUnsafe<T[]>(sql, ...values);
}

interface TargetRow {
  type: SEOEntityType; id: string; name: string; summary: string | null;
  year: string; location_slug: string; collection_slug: string | null;
}
const TARGET_SQL = `SELECT 'location' AS type, l.id, l.name, l.summary, y.label AS year,
  l.slug AS location_slug, NULL AS collection_slug
  FROM locations l JOIN years y ON y.id = l.year_id
  UNION ALL
  SELECT 'collection' AS type, c.id, c.title AS name, c.summary, y.label AS year,
  l.slug AS location_slug, c.slug AS collection_slug
  FROM collections c JOIN years y ON y.id = c.year_id
  JOIN locations l ON l.id = c.location_id`;
const HOMEPAGE: SEOTarget = {
  type: 'homepage', id: 'homepage', label: '首頁', path: '/',
  defaultTitle: 'UTOA Photography', defaultDescription: 'Moments In Focus',
};
function mapTarget(row: TargetRow): SEOTarget {
  const segments = [row.year, row.location_slug];
  if (row.collection_slug !== null) segments.push(row.collection_slug);
  return {
    type: row.type, id: row.id, label: `${row.year} / ${row.name}`,
    path: '/' + segments.map(encodeURIComponent).join('/'),
    defaultTitle: `${row.name} — ${row.year} | UTOA Photography`,
    defaultDescription: row.summary ?? (row.type === 'location'
      ? '探索該地點的攝影作品與故事。' : '探索這組攝影作品與故事。'),
  };
}
export async function listSEOTargets(): Promise<SEOTarget[]> {
  const rows = await query<TargetRow>(`SELECT * FROM (${TARGET_SQL}) ORDER BY year DESC, name, id`);
  return [HOMEPAGE, ...rows.map(mapTarget)];
}
export async function getSEOTarget(type: SEOEntityType, id: string): Promise<SEOTarget | null> {
  if (type === 'homepage') return id === 'homepage' ? HOMEPAGE : null;
  const rows = await query<TargetRow>(`SELECT * FROM (${TARGET_SQL}) WHERE type = ? AND id = ?`, [type, id]);
  return rows[0] ? mapTarget(rows[0]) : null;
}
interface SEORow extends SEOFields { image_id: string | null; image_alt: string | null }
export async function readSEO(type: SEOEntityType, id: string): Promise<{ fields: SEOFields; image: SEOImage | null }> {
  const [row] = await query<SEORow>(`SELECT s.title, s.description, s.og_asset_id,
    a.id AS image_id, a.alt AS image_alt FROM seo_metadata s
    LEFT JOIN assets a ON a.id = s.og_asset_id WHERE s.entity_type = ? AND s.entity_id = ?`, [type, id]);
  return {
    fields: row ? { title: row.title, description: row.description, og_asset_id: row.og_asset_id } : { ...EMPTY_SEO },
    image: row?.image_id ? { url: getImageUrl(row.image_id, 'large'), alt: row.image_alt ?? '' } : null,
  };
}
export async function getPageSEO(type: SEOEntityType, id: string, defaults: { title: string; description: string }, path: string) {
  const { fields, image } = await readSEO(type, id);
  return buildPageMetadata({ defaults, fields, image, path, siteUrl: getSiteUrl() });
}
export async function getSEOEditor(target: SEOTarget): Promise<SEOEditorData> {
  const { fields } = await readSEO(target.type, target.id);
  // Include the selected image even when it is outside the latest 100 assets.
  const rows = await query<{ id: string; alt: string }>(`SELECT id, alt FROM assets
    ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, created_at DESC, id LIMIT 100`, [fields.og_asset_id ?? '']);
  return {
    target, fields, siteUrl: getSiteUrl(), defaultImage: DEFAULT_SEO_IMAGE,
    images: rows.map(row => ({ id: row.id, alt: row.alt, url: getImageUrl(row.id, 'large') })),
  };
}
export async function seoAssetExists(id: string) {
  return (await query<{ id: string }>('SELECT id FROM assets WHERE id = ? LIMIT 1', [id])).length > 0;
}
export async function saveSEO(type: SEOEntityType, id: string, fields: SEOFields) {
  const now = new Date().toISOString();
  const sql = `INSERT INTO seo_metadata (id, entity_type, entity_id, title, description, og_asset_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET title = excluded.title,
    description = excluded.description, og_asset_id = excluded.og_asset_id, updated_at = excluded.updated_at`;
  const values = [crypto.randomUUID(), type, id, fields.title, fields.description, fields.og_asset_id, now];
  const auditSql = `INSERT INTO audit_logs (id, actor, actor_type, entity_type, entity_id, action, timestamp, meta)
    VALUES (?, 'admin', 'user', 'seo_metadata', ?, 'edit', ?, ?)`;
  const auditValues = [crypto.randomUUID(), `${type}/${id}`, now, JSON.stringify({ fields })];
  if (shouldUseD1Direct()) {
    const db = getD1Database() as D1Database;
    await db.batch([db.prepare(sql).bind(...values), db.prepare(auditSql).bind(...auditValues)]);
  } else {
    const { prisma } = await import('@/lib/db');
    await prisma.$transaction([
      prisma.$executeRawUnsafe(sql, ...values),
      prisma.$executeRawUnsafe(auditSql, ...auditValues),
    ]);
  }
}
