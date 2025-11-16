import { cache } from 'react';
import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct } from './d1-queries';
import { getD1Database } from './cloudflare';

export interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverAssetId: string | null;
  coverAssetWidth: number | null;
  coverAssetHeight: number | null;
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
      orderIndex: String(row.order_index),
      collectionCount: collections.length,
      collections,
    });
  }
  return locations;
}

async function fetchNavLocationsForYearD1(
  db: D1Database,
  yearId: string,
): Promise<LocationNavEntry[]> {
  const result = await db.prepare(
    `
      SELECT id, slug, name, order_index
      FROM locations
      WHERE year_id = ?1
      ORDER BY order_index ASC
    `,
  ).bind(yearId).all();

  const rows = (result.results ?? []) as D1LocationRow[];
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    orderIndex: String(row.order_index),
  }));
}

type D1Database = ReturnType<typeof getD1Database>;
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

  return entries;
}

async function fetchYearsNavD1(): Promise<YearNavEntry[]> {
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
  const entries: YearNavEntry[] = [];

  for (const row of rows) {
    const locations = await fetchNavLocationsForYearD1(db, String(row.id));
    entries.push({
      id: String(row.id),
      label: String(row.label),
      orderIndex: String(row.order_index),
      status: String(row.status),
      locations,
    });
  }

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
  return {
    id: String(year.id),
    label: String(year.label),
    orderIndex: String(year.order_index),
    status: String(year.status),
    locations,
  };
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
  return {
    generatedAt: new Date().toISOString(),
    years: years.map(mapYear),
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
  return year ? mapYear(year) : null;
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
  const location = mappedYear.locations.find((entry) => entry.slug === slug);
  if (!location) {
    return null;
  }

  return { year: mappedYear, location };
}

export const getLocationByYearAndSlugCached = cache(getLocationByYearAndSlug);

export async function loadYearLocationNavData(): Promise<YearNavEntry[]> {
  if (shouldUseD1Direct()) {
    return fetchYearsNavD1();
  }

  const prisma = await getPrisma();
  const years = await prisma.year.findMany({
    where: { status: 'published' },
    orderBy: { order_index: 'asc' },
    select: {
      id: true,
      label: true,
      order_index: true,
      status: true,
      locations: {
        orderBy: { order_index: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          order_index: true,
        },
      },
    },
  });

  return years.map((year) => ({
    id: year.id,
    label: year.label,
    orderIndex: year.order_index,
    status: year.status,
    locations: (year.locations ?? []).map((location) => ({
      id: location.id,
      slug: location.slug,
      name: location.name,
      orderIndex: location.order_index,
    })),
  }));
}
