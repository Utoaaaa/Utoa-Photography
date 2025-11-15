import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct } from '@/lib/d1-queries';
import { getD1Database } from '@/lib/cloudflare';

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

async function buildCollectionResponseD1(row: D1CollectionRow): Promise<CollectionViewerPayload> {
  const db = requireD1();

  const assetsResult = await db.prepare(
    `
      SELECT
        a.id,
        a.alt,
        a.caption,
        a.width,
        a.height
      FROM collection_assets ca
      JOIN assets a ON a.id = ca.asset_id
      WHERE ca.collection_id = ?1
      ORDER BY CAST(ca.order_index AS REAL) ASC, ca.order_index ASC, ca.created_at ASC
    `,
  ).bind(row.id).all();

  const photos = (assetsResult.results ?? []).map((asset: Record<string, unknown>) => ({
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

async function fetchCollectionBySlugD1(params: { yearLabel: string; slug: string; allowAnyYearStatus?: boolean }) {
  const { yearLabel, slug, allowAnyYearStatus } = params;
  const db = requireD1();

  const row = await db
    .prepare(
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
        WHERE c.slug = ?1 AND y.label = ?2
        ${allowAnyYearStatus ? '' : "AND y.status = 'published'"}
        ORDER BY y.created_at DESC, c.created_at DESC
        LIMIT 1
      `,
    )
    .bind(slug, yearLabel)
    .first() as D1CollectionRow | null;

  if (!row) {
    return null;
  }

  return buildCollectionResponseD1(row);
}

async function fetchCollectionByIdD1(collectionId: string) {
  const db = requireD1();

  const row = await db
    .prepare(
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
        WHERE c.id = ?1
        LIMIT 1
      `,
    )
    .bind(collectionId)
    .first() as D1CollectionRow | null;

  if (!row) {
    return null;
  }

  return buildCollectionResponseD1(row);
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

export async function fetchCollectionForViewer(params: {
  yearLabel: string;
  slug: string;
  allowAnyYearStatus?: boolean;
}): Promise<CollectionViewerPayload | null> {
  const { yearLabel, slug, allowAnyYearStatus = false } = params;
  if (shouldUseD1Direct()) {
    return fetchCollectionBySlugD1({ yearLabel, slug, allowAnyYearStatus });
  }

  const prisma = await getPrisma();

  const collection = await prisma.collection.findFirst({
    where: {
      slug,
      year: {
        label: yearLabel,
        ...(allowAnyYearStatus ? {} : { status: 'published' }),
      },
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
    return null;
  }

  return mapPrismaCollection(collection);
}

export async function fetchCollectionByIdForViewer(collectionId: string): Promise<CollectionViewerPayload | null> {
  if (shouldUseD1Direct()) {
    return fetchCollectionByIdD1(collectionId);
  }

  const prisma = await getPrisma();
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
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
