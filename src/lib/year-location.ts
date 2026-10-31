import { cache } from 'react';
import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct } from './d1-queries';
import { getD1Database } from './cloudflare';
import { getLocalYearLocationData, localTestDataForced, localTestDataEnabled } from './local-test-data';

export interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  photoCount: number;
  coverAssetId: string | null;
  coverAssetWidth: number | null;
  coverAssetHeight: number | null;
  orderIndex: string;
  capturedAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface LocationEntry {
  id: string;
  yearId: string;
  slug: string;
  name: string;
  summary: string | null;
  coverAssetId: string | null;
  coverAssetWidth?: number | null;
  coverAssetHeight?: number | null;
  orderIndex: string;
  collectionCount: number;
  collections: LocationCollectionSummary[];
}

export interface YearEntry {
  id: string;
  label: string;
  orderIndex: string;
  status: string;
  locations: LocationEntry[];
}

export interface YearLocationPayload {
  generatedAt: string;
  years: YearEntry[];
}

export interface LocationNavEntry {
  id: string;
  slug: string;
  name: string;
  orderIndex: string;
}

export interface YearNavEntry {
  id: string;
  label: string;
  orderIndex: string;
  status: string;
  locations: LocationNavEntry[];
}

type CollectionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width?: number | null;
  cover_asset_height?: number | null;
  order_index: string;
  captured_at: Date | null;
  published_at: Date | null;
  updated_at: Date;
  cover_asset?: {
    width: number | null;
    height: number | null;
  } | null;
  _count?: {
    collection_assets: number;
  };
};

type LocationRecord = {
  id: string;
  year_id: string;
  slug: string;
  name: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width?: number | null;
  cover_asset_height?: number | null;
  order_index: string;
  collections: CollectionRecord[];
};

type YearRecord = {
  id: string;
  label: string;
  order_index: string;
  status: string;
  locations: LocationRecord[];
};

type YearWhereInput = Prisma.YearWhereInput;

type PrismaClient = import('@prisma/client').PrismaClient;

let nodeDbPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!nodeDbPromise) {
    nodeDbPromise = import('./db').then(({ prisma }) => prisma);
  }
  return nodeDbPromise;
}

function requireD1() {
  const db = getD1Database();
  if (!db) {
    throw new Error('D1 database not available');
  }
  return db;
}

function mapCollection(record: CollectionRecord): LocationCollectionSummary {
  const coverAsset = record.cover_asset ?? null;
  const width = record.cover_asset_width ?? coverAsset?.width ?? null;
  const height = record.cover_asset_height ?? coverAsset?.height ?? null;
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary ?? null,
    photoCount: record._count?.collection_assets ?? 0,
    coverAssetId: record.cover_asset_id ?? null,
    coverAssetWidth: width,
    coverAssetHeight: height,
    orderIndex: record.order_index,
    capturedAt: record.captured_at ? record.captured_at.toISOString() : null,
    publishedAt: record.published_at ? record.published_at.toISOString() : null,
    updatedAt: record.updated_at.toISOString(),
  };
}

function mapLocation(record: LocationRecord): LocationEntry {
  const collections = (record.collections ?? []).map(mapCollection);
  return {
    id: record.id,
    yearId: record.year_id,
    slug: record.slug,
    name: record.name,
    summary: record.summary ?? null,
    coverAssetId: record.cover_asset_id ?? null,
    coverAssetWidth: record.cover_asset_width ?? null,
    coverAssetHeight: record.cover_asset_height ?? null,
    orderIndex: record.order_index,
    collectionCount: collections.length,
    collections,
  };
}

function mapYear(record: YearRecord): YearEntry {
  const locations = (record.locations ?? []).map(mapLocation);
  return {
    id: record.id,
    label: record.label,
    orderIndex: record.order_index,
    status: record.status,
    locations,
  };
}

async function attachCoverDimensions(years: YearRecord[], prisma: PrismaClient): Promise<YearRecord[]> {
  const covers = years.flatMap(year => year.locations.flatMap(location => [location, ...location.collections]));
  const ids = [...new Set(covers.map(item => item.cover_asset_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return years;
  const assets = await prisma.asset.findMany({ where: { id: { in: ids } }, select: { id: true, width: true, height: true } });
  const dimensions = new Map(assets.map(asset => [asset.id, asset]));
  for (const cover of covers) {
    const asset = dimensions.get(cover.cover_asset_id || '');
    cover.cover_asset_width = asset?.width ?? null;
    cover.cover_asset_height = asset?.height ?? null;
  }
  return years;
}

async function fetchYears(where: YearWhereInput): Promise<YearRecord[]> {
  const prisma = await getPrisma();
  const years = await prisma.year.findMany({
    where,
    orderBy: { order_index: 'asc' },
    include: {
      locations: {
        orderBy: { order_index: 'asc' },
        include: {
          collections: {
            where: { status: 'published' },
            orderBy: { order_index: 'asc' },
            select: {
              id: true,
              slug: true,
              title: true,
              summary: true,
              cover_asset_id: true,
              order_index: true,
              captured_at: true,
              published_at: true,
              updated_at: true,
              _count: {
                select: { collection_assets: true },
              },
            },
          },
        },
      },
    },
  });

  return attachCoverDimensions(years as unknown as YearRecord[], prisma);
}

type D1YearRow = {
  id: string;
  label: string;
  order_index: string;
  status: string;
};

type D1LocationRow = {
  id: string;
  year_id: string;
  slug: string;
  name: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width?: number | null;
  cover_asset_height?: number | null;
  order_index: string;
};

type D1CollectionRow = {
  id: string;
  location_id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width: number | null;
  cover_asset_height: number | null;
  photo_count: number | string | null;
  order_index: string;
  captured_at: string | null;
  published_at: string | null;
  updated_at: string | null;
};

function mapCollectionRowD1(row: D1CollectionRow): LocationCollectionSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary ?? null,
    photoCount: Number(row.photo_count ?? 0),
    coverAssetId: row.cover_asset_id ?? null,
    coverAssetWidth: row.cover_asset_width != null ? Number(row.cover_asset_width) : null,
    coverAssetHeight: row.cover_asset_height != null ? Number(row.cover_asset_height) : null,
    orderIndex: String(row.order_index),
    capturedAt: row.captured_at ? new Date(row.captured_at).toISOString() : null,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

type D1Database = ReturnType<typeof getD1Database>;

/**
 * The whole published tree in a single batch round trip. Loading it as years → locations per
 * year → collections per location cost three sequential D1 round trips and 1 + Y + L queries.
 */
async function fetchYearsD1(): Promise<YearEntry[]> {
  const db: D1Database = requireD1();
  const [yearsResult, locationsResult, collectionsResult] = await db.batch([
    db.prepare(`
      SELECT id, label, order_index, status
      FROM years
      WHERE status = 'published'
      ORDER BY CAST(order_index AS REAL) ASC, order_index ASC
    `),
    db.prepare(`
      SELECT l.id, l.year_id, l.slug, l.name, l.summary, l.cover_asset_id, l.order_index,
             a.width AS cover_asset_width, a.height AS cover_asset_height
      FROM locations l
      JOIN years y ON y.id = l.year_id AND y.status = 'published'
      LEFT JOIN assets a ON a.id = l.cover_asset_id
      ORDER BY CAST(l.order_index AS REAL) ASC, l.order_index ASC
    `),
    db.prepare(`
      SELECT
        c.id,
        c.location_id,
        c.slug,
        c.title,
        c.summary,
        c.cover_asset_id,
        a.width AS cover_asset_width,
        a.height AS cover_asset_height,
        (
          SELECT COUNT(*)
          FROM collection_assets ca
          WHERE ca.collection_id = c.id
        ) AS photo_count,
        c.order_index,
        c.captured_at,
        c.published_at,
        c.updated_at
      FROM collections c
      JOIN locations l ON l.id = c.location_id
      JOIN years y ON y.id = l.year_id AND y.status = 'published'
      LEFT JOIN assets a ON a.id = c.cover_asset_id
      WHERE c.status = 'published'
      ORDER BY CAST(c.order_index AS REAL) ASC, c.order_index ASC
    `),
  ]);

  const collectionsByLocation = new Map<string, LocationCollectionSummary[]>();
  for (const row of (collectionsResult.results ?? []) as D1CollectionRow[]) {
    const key = String(row.location_id);
    collectionsByLocation.set(key, [...(collectionsByLocation.get(key) ?? []), mapCollectionRowD1(row)]);
  }

  const locationsByYear = new Map<string, LocationEntry[]>();
  for (const row of (locationsResult.results ?? []) as D1LocationRow[]) {
    const collections = collectionsByLocation.get(String(row.id)) ?? [];
    const key = String(row.year_id);
    locationsByYear.set(key, [
      ...(locationsByYear.get(key) ?? []),
      {
        id: String(row.id),
        yearId: String(row.year_id),
        slug: String(row.slug),
        name: String(row.name),
        summary: row.summary ?? null,
        coverAssetId: row.cover_asset_id ?? null,
        coverAssetWidth: row.cover_asset_width ?? null,
        coverAssetHeight: row.cover_asset_height ?? null,
        orderIndex: String(row.order_index),
        collectionCount: collections.length,
        collections,
      },
    ]);
  }

  return ((yearsResult.results ?? []) as D1YearRow[]).map((row) => ({
    id: String(row.id),
    label: String(row.label),
    orderIndex: String(row.order_index),
    status: String(row.status),
    locations: locationsByYear.get(String(row.id)) ?? [],
  }));
}

/**
 * The published year → location → collection tree, loaded once per request (React cache):
 * the site layout's menu, the page and generateMetadata all read this same result.
 */
export const loadYearLocationData = cache(async (): Promise<YearLocationPayload> => {
  if (localTestDataForced) {
    return getLocalYearLocationData();
  }

  if (shouldUseD1Direct()) {
    return {
      generatedAt: new Date().toISOString(),
      years: await fetchYearsD1(),
    };
  }

  try {
    const years = await fetchYears({ status: 'published' });
    if (years.length > 0 || !localTestDataEnabled) {
      return {
        generatedAt: new Date().toISOString(),
        years: years.map(mapYear),
      };
    }
  } catch (error) {
    if (!localTestDataEnabled) {
      throw error;
    }
    console.warn('[local-test-data] Falling back to local year/location data:', error);
  }

  return getLocalYearLocationData();
});

/** A published year by label, read from the per-request tree (no extra query). */
export async function getYearByLabel(label: string): Promise<YearEntry | null> {
  if (!label) {
    return null;
  }
  const { years } = await loadYearLocationData();
  return years.find((year) => year.label === label && year.status === 'published') ?? null;
}

/** A location of a published year, read from the per-request tree (no extra query). */
export async function getLocationByYearAndSlug(
  label: string,
  slug: string
): Promise<{ year: YearEntry; location: LocationEntry } | null> {
  if (!label || !slug) {
    return null;
  }
  const { years } = await loadYearLocationData();
  // Labels are not unique, so look in every published year with this label.
  for (const year of years) {
    if (year.label !== label || year.status !== 'published') continue;
    const location = year.locations.find((entry) => entry.slug === slug);
    if (location) return { year, location };
  }
  return null;
}

export const getLocationByYearAndSlugCached = cache(getLocationByYearAndSlug);

/** Menu data, derived from the same per-request tree the page uses (one load for both). */
export async function loadYearLocationNavData(): Promise<YearNavEntry[]> {
  const { years } = await loadYearLocationData();
  return years.map((year) => ({
    id: year.id,
    label: year.label,
    orderIndex: year.orderIndex,
    status: year.status,
    locations: year.locations.map(({ id, slug, name, orderIndex }) => ({ id, slug, name, orderIndex })),
  }));
}
