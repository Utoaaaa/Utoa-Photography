import { getD1Database } from '@/lib/cloudflare';

type CollectionStatus = 'draft' | 'published';

export type D1Collection = {
  id: string;
  year_id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: CollectionStatus;
  order_index: string;
  cover_asset_id: string | null;
  location_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_published_at: string | null;
  version: number;
  publish_note: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
};

type CreateCollectionInput = {
  slug: string;
  title: string;
  summary?: string | null;
  status: CollectionStatus;
  order_index: string;
  cover_asset_id?: string | null;
  location_id?: string | null;
};

function requireDb() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

function mapCollection(row: Record<string, unknown>): D1Collection {
  return {
    id: String(row.id),
    year_id: String(row.year_id),
    slug: String(row.slug),
    title: String(row.title),
    summary: (row.summary ?? null) as string | null,
    status: (row.status ?? 'draft') as CollectionStatus,
    order_index: String(row.order_index),
    cover_asset_id: (row.cover_asset_id ?? null) as string | null,
    location_id: (row.location_id ?? null) as string | null,
    template_id: (row.template_id ?? null) as string | null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    published_at: (row.published_at ?? null) as string | null,
    last_published_at: (row.last_published_at ?? null) as string | null,
    version: Number(row.version ?? 1),
    publish_note: (row.publish_note ?? null) as string | null,
    seo_title: (row.seo_title ?? null) as string | null,
    seo_description: (row.seo_description ?? null) as string | null,
    seo_keywords: (row.seo_keywords ?? null) as string | null,
  };
}

export async function d1ListCollectionsForYear(params: {
  yearId: string;
  status: 'draft' | 'published' | 'all';
}): Promise<D1Collection[]> {
  const db = requireDb();
  const { yearId, status } = params;

  const bindings: unknown[] = [yearId];
  let query = 'SELECT * FROM collections WHERE year_id = ?1';

  if (status !== 'all') {
    query += ' AND status = ?2';
    bindings.push(status);
  }

  query += ' ORDER BY order_index ASC';

  const result = await db.prepare(query).bind(...bindings).all();
  return (result.results ?? []).map((row: unknown) => mapCollection(row as Record<string, unknown>));
}

export async function d1CreateCollection(
  yearId: string,
  input: CreateCollectionInput,
): Promise<D1Collection> {
  const db = requireDb();
  const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  const publishedAt = input.status === 'published' ? now : null;

  await db.prepare(
    `
      INSERT INTO collections (
        id,
        year_id,
        slug,
        title,
        summary,
        status,
        order_index,
        cover_asset_id,
        location_id,
        template_id,
        created_at,
        updated_at,
        published_at,
        last_published_at,
        version,
        publish_note,
        seo_title,
        seo_description,
        seo_keywords
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL,
        ?10, ?10, ?11, ?11, 1, NULL, NULL, NULL, NULL
      )
    `,
  ).bind(
    id,
    yearId,
    input.slug,
    input.title,
    input.summary ?? null,
    input.status,
    input.order_index,
    input.cover_asset_id ?? null,
    input.location_id ?? null,
    now,
    publishedAt,
  ).run();

  const created = await db.prepare('SELECT * FROM collections WHERE id = ?1 LIMIT 1').bind(id).first();
  if (!created) {
    throw new Error('Failed to load created collection');
  }

  return mapCollection(created as Record<string, unknown>);
}
