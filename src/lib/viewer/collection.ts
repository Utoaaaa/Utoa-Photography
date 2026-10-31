import { cache } from 'react';
import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';
import { cachedPublicData } from '@/lib/edge-cache';
import { getLocalCollectionForViewer, localTestDataEnabled, localTestDataForced } from '@/lib/local-test-data';

type PrismaClient = import('@prisma/client').PrismaClient;

type PrismaCollectionWithRelations = Prisma.CollectionGetPayload<{
  include: {
    year: true;
    location: true;
    collection_assets: { include: { asset: true } };
  };
}>;

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

interface D1CollectionRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  location_id: string | null;
  year_id: string;
  year_label: string;
  year_status: string;
  location_slug: string | null;
  location_name: string | null;
  location_summary: string | null;
}

export interface CollectionViewerPayload {
  year: { id: string; label: string };
  location: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
  } | null;
  collection: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
  };
  photos: Array<{ id: string; alt: string; caption: string | null; width: number; height: number }>;
}

function buildCollectionResponseD1(
  row: D1CollectionRow,
  assetRows: Array<Record<string, unknown>>,
): CollectionViewerPayload {
  const photos = assetRows.map((asset) => ({
    id: String(asset.id),
    alt: String(asset.alt ?? ''),
    caption: asset.caption != null ? String(asset.caption) : null,
    width: Number(asset.width ?? 0),
    height: Number(asset.height ?? 0),
  }));

  const location = row.location_id
    ? {
        id: String(row.location_id),
        slug: row.location_slug ? String(row.location_slug) : '',
        name: row.location_name ? String(row.location_name) : '',
        summary: row.location_summary != null ? String(row.location_summary) : null,
      }
    : null;

  return {
    year: { id: String(row.year_id), label: String(row.year_label) },
    location,
    collection: {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      summary: row.summary != null ? String(row.summary) : null,
    },
    photos,
  };
}

/**
 * `collectionIdSql` selects the id of the one published collection to show. Both statements
 * resolve it through that same subquery, so a single batch round trip returns the collection
 * and its photos (previously two sequential round trips).
 */
async function fetchPublishedCollectionD1(collectionIdSql: string, bindings: unknown[]) {
  const db = requireD1();
  const [rowResult, photosResult] = await db.batch([
    db.prepare(
      `
        SELECT
          c.id,
          c.slug,
          c.title,
          c.summary,
          c.location_id,
          c.year_id,
          y.label AS year_label,
          y.status AS year_status,
          l.slug AS location_slug,
          l.name AS location_name,
          l.summary AS location_summary
        FROM collections c
        JOIN years y ON y.id = c.year_id
        LEFT JOIN locations l ON l.id = c.location_id
        WHERE c.id = (${collectionIdSql})
      `,
    ).bind(...bindings),
    db.prepare(
      `
        SELECT
          a.id,
          a.alt,
          a.caption,
          a.width,
          a.height
        FROM collection_assets ca
        JOIN assets a ON a.id = ca.asset_id
        WHERE ca.collection_id = (${collectionIdSql})
        ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
      `,
    ).bind(...bindings),
  ]);

  const row = (rowResult.results ?? [])[0] as D1CollectionRow | undefined;
  return row ? buildCollectionResponseD1(row, photosResult.results ?? []) : null;
}

function fetchCollectionBySlugD1(params: { yearLabel: string; slug: string }) {
  return fetchPublishedCollectionD1(
    `
      SELECT c.id
      FROM collections c
      JOIN years y ON y.id = c.year_id
      WHERE c.slug = ?1 AND y.label = ?2
        AND c.status = 'published' AND y.status = 'published'
      ORDER BY y.created_at DESC, c.created_at DESC
      LIMIT 1
    `,
    [params.slug, params.yearLabel],
  );
}

function fetchCollectionByIdD1(collectionId: string) {
  return fetchPublishedCollectionD1(
    `
      SELECT c.id
      FROM collections c
      JOIN years y ON y.id = c.year_id
      WHERE c.id = ?1
        AND c.status = 'published' AND y.status = 'published'
    `,
    [collectionId],
  );
}

function mapPrismaCollection(collection: NonNullable<PrismaCollectionWithRelations>): CollectionViewerPayload {
  return {
    year: { id: collection.year!.id, label: collection.year!.label },
    location: collection.location
      ? {
          id: collection.location.id,
          slug: collection.location.slug,
          name: collection.location.name,
          summary: collection.location.summary ?? null,
        }
      : null,
    collection: {
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      summary: collection.summary ?? null,
    },
    photos: collection.collection_assets.map((ca) => ({
      id: ca.asset.id,
      alt: ca.asset.alt,
      caption: ca.asset.caption,
      width: ca.asset.width,
      height: ca.asset.height,
    })),
  };
}

/** Public viewer data: only published collections of published years are ever returned. */
export async function fetchCollectionForViewer(params: {
  yearLabel: string;
  slug: string;
}): Promise<CollectionViewerPayload | null> {
  // Primitive arguments so generateMetadata and the page share one lookup per request.
  return fetchPublishedCollection(params.yearLabel, params.slug);
}

const fetchPublishedCollection = cache(async (yearLabel: string, slug: string) => {
  if (localTestDataForced) {
    return getLocalCollectionForViewer({ yearLabel, slug });
  }

  if (shouldUseD1Direct()) {
    // Not-found results are cached too, so unknown URLs do not reach D1 on every request.
    return cachedPublicData(`collection/${yearLabel}/${slug}`, () => fetchCollectionBySlugD1({ yearLabel, slug }));
  }

  try {
    const prisma = await getPrisma();

    const collection = await prisma.collection.findFirst({
      where: {
        slug,
        status: 'published',
        year: { label: yearLabel, status: 'published' },
      },
      orderBy: [
        { year: { created_at: 'desc' } },
        { created_at: 'desc' },
      ],
      include: {
        collection_assets: {
          include: { asset: true },
          orderBy: { order_index: 'asc' },
        },
        year: true,
        location: true,
      },
    });

    if (!collection) {
      return localTestDataEnabled ? getLocalCollectionForViewer({ yearLabel, slug }) : null;
    }

    return mapPrismaCollection(collection);
  } catch (error) {
    if (!localTestDataEnabled) {
      throw error;
    }
    console.warn(`[local-test-data] Falling back to local collection data for ${yearLabel}/${slug}:`, error);
    return getLocalCollectionForViewer({ yearLabel, slug });
  }
});

export async function fetchCollectionByIdForViewer(collectionId: string): Promise<CollectionViewerPayload | null> {
  if (shouldUseD1Direct()) {
    return fetchCollectionByIdD1(collectionId);
  }

  const prisma = await getPrisma();
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, status: 'published', year: { status: 'published' } },
    include: {
      collection_assets: {
        include: { asset: true },
        orderBy: { order_index: 'asc' },
      },
      year: true,
      location: true,
    },
  });

  if (!collection) {
    return null;
  }

  return mapPrismaCollection(collection);
}
