import type { Prisma } from '@prisma/client';

import { prisma } from './db';

export interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverAssetId: string | null;
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

type CollectionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_asset_id: string | null;
  order_index: string;
  published_at: Date | null;
  updated_at: Date;
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

function mapCollection(record: CollectionRecord): LocationCollectionSummary {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary ?? null,
    coverAssetId: record.cover_asset_id ?? null,
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

export async function loadYearLocationData(): Promise<YearLocationPayload> {
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
