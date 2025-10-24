import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct } from './d1-queries';
import { getD1Database } from './cloudflare';
import { getVariantVersion } from './images';

export interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverAssetId: string | null;
  coverAssetWidth: number | null;
  coverAssetHeight: number | null;
  coverAssetVariantVersion: string | null;
  orderIndex: string;
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
  coverAssetVariantVersion: string | null;
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

type CollectionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width?: number | null;
  cover_asset_height?: number | null;
  order_index: string;
  published_at: Date | null;
  updated_at: Date;
  cover_asset?: {
    width: number | null;
    height: number | null;
  } | null;
};

type LocationRecord = {
  id: string;
  year_id: string;
  slug: string;
  name: string;
  summary: string | null;
  cover_asset_id: string | null;
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
    coverAssetId: record.cover_asset_id ?? null,
    coverAssetWidth: width,
    coverAssetHeight: height,
    coverAssetVariantVersion: null,
    orderIndex: record.order_index,
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
    coverAssetVariantVersion: null,
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
              published_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  return years as unknown as YearRecord[];
}

async function fetchSingleYear(where: YearWhereInput): Promise<YearRecord | null> {
  const prisma = await getPrisma();
  const year = await prisma.year.findFirst({
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
              published_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });

  if (!year) {
    return null;
  }

  return year as unknown as YearRecord;
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
  order_index: string;
};

type D1CollectionRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_asset_id: string | null;
  cover_asset_width: number | null;
  cover_asset_height: number | null;
  order_index: string;
  published_at: string | null;
  updated_at: string | null;
};

async function fetchCollectionsForLocationD1(
  db: D1Database,
  locationId: string,
): Promise<LocationCollectionSummary[]> {
  const result = await db.prepare(
    `
      SELECT
        c.id,
        c.slug,
        c.title,
        c.summary,
        c.cover_asset_id,
        a.width AS cover_asset_width,
        a.height AS cover_asset_height,
        c.order_index,
        c.published_at,
        c.updated_at
      FROM collections c
      LEFT JOIN assets a ON a.id = c.cover_asset_id
      WHERE c.location_id = ?1 AND c.status = 'published'
      ORDER BY order_index ASC
    `,
  ).bind(locationId).all();

  const rows = (result.results ?? []) as D1CollectionRow[];
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary ?? null,
    coverAssetId: row.cover_asset_id ?? null,
    coverAssetWidth: row.cover_asset_width != null ? Number(row.cover_asset_width) : null,
    coverAssetHeight: row.cover_asset_height != null ? Number(row.cover_asset_height) : null,
    coverAssetVariantVersion: null,
    orderIndex: String(row.order_index),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }));
}

async function fetchLocationsForYearD1(
  db: D1Database,
  yearId: string,
): Promise<LocationEntry[]> {
  const result = await db.prepare(
    `
      SELECT id, year_id, slug, name, summary, cover_asset_id, order_index
      FROM locations
      WHERE year_id = ?1
      ORDER BY order_index ASC
    `,
  ).bind(yearId).all();

  const rows = (result.results ?? []) as D1LocationRow[];

  const locations: LocationEntry[] = [];
  for (const row of rows) {
    const collections = await fetchCollectionsForLocationD1(db, String(row.id));
    locations.push({
      id: String(row.id),
      yearId: String(row.year_id),
      slug: String(row.slug),
      name: String(row.name),
    summary: row.summary ?? null,
    coverAssetId: row.cover_asset_id ?? null,
    coverAssetVariantVersion: null,
    orderIndex: String(row.order_index),
    collectionCount: collections.length,
    collections,
  });
  }
  return locations;
}

type D1Database = ReturnType<typeof getD1Database>;

async function enrichVariantVersions(years: YearEntry[]): Promise<void> {
  if (years.length === 0) return;
  const assetIds = new Set<string>();
  years.forEach((year) => {
    year.locations.forEach((location) => {
      if (location.coverAssetId) assetIds.add(location.coverAssetId);
      location.collections.forEach((collection) => {
        if (collection.coverAssetId) assetIds.add(collection.coverAssetId);
      });
    });
  });

  if (assetIds.size === 0) return;

  const idList = Array.from(assetIds);
  const assetInfo: Record<string, { metadata: unknown; width: number | null; height: number | null }> = {};

  if (shouldUseD1Direct()) {
    const db = requireD1();
    const chunkSize = 50;
    for (let offset = 0; offset < idList.length; offset += chunkSize) {
      const chunk = idList.slice(offset, offset + chunkSize);
      if (chunk.length === 0) continue;
      const placeholders = chunk.map(() => '?').join(',');
      const result = await db.prepare(
        `SELECT id, metadata_json, width, height FROM assets WHERE id IN (${placeholders})`
      ).bind(...chunk).all();
      const rows = (result.results ?? []) as Array<{ id: string; metadata_json: string | null; width: number | null; height: number | null }>;
      rows.forEach((row) => {
        assetInfo[String(row.id)] = {
          metadata: row.metadata_json ?? null,
          width: row.width != null ? Number(row.width) : null,
          height: row.height != null ? Number(row.height) : null,
        };
      });
    }
  } else {
    const prisma = await getPrisma();
    const assets = await prisma.asset.findMany({
      where: { id: { in: idList } },
      select: { id: true, metadata_json: true, width: true, height: true },
    });
    assets.forEach((asset) => {
      assetInfo[asset.id] = {
        metadata: asset.metadata_json ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
      };
    });
  }

  years.forEach((year) => {
    year.locations.forEach((location) => {
      if (location.coverAssetId) {
        const info = assetInfo[location.coverAssetId];
        if (info) {
          const version = getVariantVersion(info.metadata, 'cover');
          location.coverAssetVariantVersion = version ?? null;
        }
      }
      location.collections.forEach((collection) => {
        if (collection.coverAssetId) {
          const info = assetInfo[collection.coverAssetId];
          if (info) {
            const version = getVariantVersion(info.metadata, 'cover');
            collection.coverAssetVariantVersion = version ?? null;
            if (info.width != null) collection.coverAssetWidth = info.width;
            if (info.height != null) collection.coverAssetHeight = info.height;
          }
        }
      });
    });
  });
}

async function fetchYearsD1(): Promise<YearEntry[]> {
  const db = requireD1();
  const result = await db.prepare(
    `
      SELECT id, label, order_index, status
      FROM years
      WHERE status = 'published'
      ORDER BY order_index ASC
    `,
  ).all();

  const rows = (result.results ?? []) as D1YearRow[];
  const entries: YearEntry[] = [];

  for (const row of rows) {
    const locations = await fetchLocationsForYearD1(db, String(row.id));
    entries.push({
      id: String(row.id),
      label: String(row.label),
      orderIndex: String(row.order_index),
      status: String(row.status),
      locations,
    });
  }

  await enrichVariantVersions(entries);
  return entries;
}

async function fetchYearByLabelD1(label: string): Promise<YearEntry | null> {
  const db = requireD1();
  const year = await db.prepare(
    `
      SELECT id, label, order_index, status
      FROM years
      WHERE label = ?1 AND status = 'published'
      LIMIT 1
    `,
  ).bind(label).first() as D1YearRow | null;

  if (!year) {
    return null;
  }

  const locations = await fetchLocationsForYearD1(db, String(year.id));
  const entry: YearEntry = {
    id: String(year.id),
    label: String(year.label),
    orderIndex: String(year.order_index),
    status: String(year.status),
    locations,
  };
  await enrichVariantVersions([entry]);
  return entry;
}

async function fetchLocationBySlugD1(
  label: string,
  slug: string,
): Promise<{ year: YearEntry; location: LocationEntry } | null> {
  const year = await fetchYearByLabelD1(label);
  if (!year) {
    return null;
  }

  const location = year.locations.find((loc) => loc.slug === slug);
  if (!location) {
    return null;
  }

  return { year, location };
}

export async function loadYearLocationData(): Promise<YearLocationPayload> {
  if (shouldUseD1Direct()) {
    const years = await fetchYearsD1();
    return {
      generatedAt: new Date().toISOString(),
      years,
    };
  }

  const years = await fetchYears({ status: 'published' });
  const mapped = years.map(mapYear);
  await enrichVariantVersions(mapped);
  return {
    generatedAt: new Date().toISOString(),
    years: mapped,
  };
}

export async function getYearByLabel(label: string): Promise<YearEntry | null> {
  if (!label) {
    return null;
  }

  if (shouldUseD1Direct()) {
    return fetchYearByLabelD1(label);
  }

  const year = await fetchSingleYear({ label, status: 'published' });
  if (!year) return null;
  const mapped = mapYear(year);
  await enrichVariantVersions([mapped]);
  return mapped;
}

export async function getLocationByYearAndSlug(
  label: string,
  slug: string,
): Promise<{ year: YearEntry; location: LocationEntry } | null> {
  if (!label || !slug) {
    return null;
  }

  if (shouldUseD1Direct()) {
    return fetchLocationBySlugD1(label, slug);
  }

  const year = await fetchSingleYear({ label, status: 'published' });
  if (!year) {
    return null;
  }

  const mappedYear = mapYear(year);
  await enrichVariantVersions([mappedYear]);
  const location = mappedYear.locations.find((entry) => entry.slug === slug);
  if (!location) {
    return null;
  }

  return { year: mappedYear, location };
}
