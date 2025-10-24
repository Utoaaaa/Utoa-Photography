import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

type PrismaClient = import('@prisma/client').PrismaClient;

let prismaPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db').then(({ prisma }) => prisma);
  }
  return prismaPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

function mapCollectionWithCount(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    year_id: String(row.year_id),
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary ?? null,
    cover_asset_id: row.cover_asset_id ?? null,
    template_id: row.template_id ?? null,
    status: String(row.status),
    order_index: String(row.order_index),
    published_at: row.published_at ?? null,
    last_published_at: row.last_published_at ?? null,
    version: Number(row.version ?? 1),
    publish_note: row.publish_note ?? null,
    seo_title: row.seo_title ?? null,
    seo_description: row.seo_description ?? null,
    seo_keywords: row.seo_keywords ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    _count: {
      collection_assets: Number(row.asset_count ?? 0),
    },
  };
}

function mapAssetRow(row: Record<string, unknown>) {
  return {
    collection_id: String(row.collection_id),
    asset_id: String(row.asset_id),
    order_index: String(row.order_index),
    slide_index: row.slide_index ?? null,
    text: row.text ?? null,
    created_at: String(row.relation_created_at ?? row.created_at ?? new Date().toISOString()),
    asset: {
      id: String(row.asset_id || row.id),
      alt: String(row.alt),
      caption: row.caption ?? null,
      description: row.description ?? null,
      title: row.title ?? null,
      photographer: row.photographer ?? null,
      location: row.location ?? null,
      tags: row.tags ?? null,
      width: Number(row.width),
      height: Number(row.height),
      metadata_json: row.metadata_json ?? null,
      location_folder_id: row.location_folder_id ?? null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    },
  };
}

export async function getCollectionsByYear(yearId: string) {
  try {
    if (shouldUseD1Direct()) {
      const db = requireD1();
      const result = await db.prepare(
        `
          SELECT
            c.*,
            (
              SELECT COUNT(*)
              FROM collection_assets ca
              WHERE ca.collection_id = c.id
            ) AS asset_count
          FROM collections c
          WHERE c.year_id = ?1 AND c.status = 'published'
          ORDER BY c.order_index ASC
        `,
      ).bind(yearId).all();

      const rows = (result.results ?? []) as Array<Record<string, unknown>>;
      return rows.map(mapCollectionWithCount);
    }

    const prisma = await getPrisma();
    return await prisma.collection.findMany({
      where: { year_id: yearId, status: 'published' },
      include: {
        _count: { select: { collection_assets: true } },
      },
      orderBy: { order_index: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching collections by year:', error);
    return [];
  }
}

export async function getCollectionBySlug(yearId: string, slug: string) {
  try {
    if (shouldUseD1Direct()) {
      const db = requireD1();
      const row = await db.prepare(
        `
          SELECT
            c.*,
            y.label AS year_label,
            y.order_index AS year_order_index,
            y.status AS year_status,
            y.created_at AS year_created_at,
            y.updated_at AS year_updated_at,
            (
              SELECT COUNT(*)
              FROM collection_assets ca
              WHERE ca.collection_id = c.id
            ) AS asset_count
          FROM collections c
          JOIN years y ON y.id = c.year_id
          WHERE c.year_id = ?1 AND c.slug = ?2
          LIMIT 1
        `,
      ).bind(yearId, slug).first() as Record<string, unknown> | null;

      if (!row) {
        return null;
      }

      const assetsResult = await db.prepare(
        `
          SELECT
            ca.collection_id,
            ca.asset_id,
            ca.order_index,
            ca.slide_index,
            ca.text,
            ca.created_at AS relation_created_at,
            a.*
          FROM collection_assets ca
          JOIN assets a ON a.id = ca.asset_id
          WHERE ca.collection_id = ?1
          ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
        `,
      ).bind(String(row.id)).all();

      const assetRows = (assetsResult.results ?? []) as Array<Record<string, unknown>>;

      return {
        ...mapCollectionWithCount(row),
        year: {
          id: String(row.year_id),
          label: String(row.year_label ?? ''),
          order_index: String(row.year_order_index ?? ''),
          status: String(row.year_status ?? ''),
          created_at: row.year_created_at ? String(row.year_created_at) : null,
          updated_at: row.year_updated_at ? String(row.year_updated_at) : null,
        },
        collection_assets: assetRows.map(mapAssetRow),
      };
    }

    const prisma = await getPrisma();
    return await prisma.collection.findUnique({
      where: {
        year_id_slug: {
          year_id: yearId,
          slug,
        },
      },
      include: {
        year: true,
        collection_assets: {
          include: { asset: true },
          orderBy: { order_index: 'asc' },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching collection by slug:', error);
    return null;
  }
}

export async function getAllCollections() {
  try {
    if (shouldUseD1Direct()) {
      const db = requireD1();
      const result = await db.prepare(
        `
          SELECT
            c.*,
            y.label AS year_label,
            y.order_index AS year_order_index,
            y.status AS year_status,
            y.created_at AS year_created_at,
            y.updated_at AS year_updated_at,
            (
              SELECT COUNT(*)
              FROM collection_assets ca
              WHERE ca.collection_id = c.id
            ) AS asset_count
          FROM collections c
          JOIN years y ON y.id = c.year_id
          ORDER BY y.order_index DESC, c.order_index ASC
        `,
      ).all();

      const rows = (result.results ?? []) as Array<Record<string, unknown>>;
      return rows.map((row) => ({
        ...mapCollectionWithCount(row),
        year: {
          id: String(row.year_id),
          label: String(row.year_label ?? ''),
          order_index: String(row.year_order_index ?? ''),
          status: String(row.year_status ?? ''),
          created_at: row.year_created_at ? String(row.year_created_at) : null,
          updated_at: row.year_updated_at ? String(row.year_updated_at) : null,
        },
      }));
    }

    const prisma = await getPrisma();
    return await prisma.collection.findMany({
      include: {
        year: true,
        _count: { select: { collection_assets: true } },
      },
      orderBy: [
        { year: { order_index: 'desc' } },
        { order_index: 'asc' },
      ],
    });
  } catch (error) {
    console.error('Error fetching all collections:', error);
    return [];
  }
}

export async function getCollectionById(id: string) {
  try {
    if (shouldUseD1Direct()) {
      const db = requireD1();
      const row = await db.prepare(
        `
          SELECT
            c.*,
            y.label AS year_label,
            y.order_index AS year_order_index,
            y.status AS year_status,
            y.created_at AS year_created_at,
            y.updated_at AS year_updated_at,
            (
              SELECT COUNT(*)
              FROM collection_assets ca
              WHERE ca.collection_id = c.id
            ) AS asset_count
          FROM collections c
          JOIN years y ON y.id = c.year_id
          WHERE c.id = ?1
          LIMIT 1
        `,
      ).bind(id).first() as Record<string, unknown> | null;

      if (!row) {
        return null;
      }

      const assetsResult = await db.prepare(
        `
          SELECT
            ca.collection_id,
            ca.asset_id,
            ca.order_index,
            ca.slide_index,
            ca.text,
            ca.created_at AS relation_created_at,
            a.*
          FROM collection_assets ca
          JOIN assets a ON a.id = ca.asset_id
          WHERE ca.collection_id = ?1
          ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
        `,
      ).bind(id).all();

      const assetRows = (assetsResult.results ?? []) as Array<Record<string, unknown>>;

      return {
        ...mapCollectionWithCount(row),
        year: {
          id: String(row.year_id),
          label: String(row.year_label ?? ''),
          order_index: String(row.year_order_index ?? ''),
          status: String(row.year_status ?? ''),
          created_at: row.year_created_at ? String(row.year_created_at) : null,
          updated_at: row.year_updated_at ? String(row.year_updated_at) : null,
        },
        collection_assets: assetRows.map(mapAssetRow),
      };
    }

    const prisma = await getPrisma();
    return await prisma.collection.findUnique({
      where: { id },
      include: {
        year: true,
        collection_assets: {
          include: { asset: true },
          orderBy: { order_index: 'asc' },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching collection by ID:', error);
    return null;
  }
}
