import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadYearLocationData } from '../src/lib/year-location';

interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverAssetId: string | null;
  orderIndex: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

interface LocationEntry {
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

interface YearEntry {
  id: string;
  label: string;
  orderIndex: string;
  status: string;
  locations: LocationEntry[];
}

interface YearLocationPayload {
  generatedAt: string;
  years: YearEntry[];
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  priority?: string;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  const fallback = 'https://utoa.photography';
  const normalized = (envUrl ?? fallback).replace(/\/$/, '');
  return normalized;
}

function formatDateForSitemap(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

function computeLatestCollectionUpdate(location: LocationEntry): string | undefined {
  const timestamps = location.collections
    .map((collection) => collection.updatedAt ?? collection.publishedAt)
    .filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) return undefined;

  const latest = timestamps.reduce((acc, current) => {
    return new Date(current).getTime() > new Date(acc).getTime() ? current : acc;
  });

  return latest;
}

function buildUrl(baseUrl: string, ...segments: string[]) {
  if (segments.length === 0) {
    return `${baseUrl}/`;
  }

  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
  return `${baseUrl}/${encodedPath}`;
}

async function readYearLocationPayload(): Promise<YearLocationPayload> {
  const dataPath = path.resolve(process.cwd(), 'public', 'data', 'year-location.json');
  try {
    const fileContent = await readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(fileContent) as YearLocationPayload;

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.years)) {
      throw new Error('Invalid year-location payload: missing years array');
    }

    if (!ISO_DATE_REGEX.test(parsed.generatedAt)) {
      throw new Error('Invalid year-location payload: generatedAt must be ISO string');
    }

    return parsed;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }

    console.warn('[generate-sitemap] year-location.json not found, falling back to live data.');
    return loadYearLocationData();
  }
}

function createSitemapEntries(baseUrl: string, payload: YearLocationPayload): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const generatedDate = formatDateForSitemap(payload.generatedAt);

  entries.push({
    loc: buildUrl(baseUrl),
    lastmod: generatedDate,
    priority: '1.0',
  });

  const yearOrder: string[] = [];
  const yearAggregation = new Map<string, YearEntry & { locations: LocationEntry[] }>();

  payload.years
    .filter((year) => year.status === 'published')
    .forEach((year) => {
      if (!yearAggregation.has(year.label)) {
        yearAggregation.set(year.label, { ...year, locations: [...year.locations] });
        yearOrder.push(year.label);
        return;
      }

      const existing = yearAggregation.get(year.label)!;
      const mergedLocations = [...existing.locations];
      year.locations.forEach((location) => {
        const alreadyExists = mergedLocations.some((existingLocation) => existingLocation.slug === location.slug);
        if (!alreadyExists) {
          mergedLocations.push(location);
        }
      });

      yearAggregation.set(year.label, { ...existing, locations: mergedLocations });
    });

  yearOrder.forEach((label) => {
    const year = yearAggregation.get(label);
    if (!year) return;

    const yearLoc = buildUrl(baseUrl, year.label);
    const latestLocationUpdate = year.locations
      .map((location) => computeLatestCollectionUpdate(location))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    entries.push({
      loc: yearLoc,
      lastmod: formatDateForSitemap(latestLocationUpdate ?? payload.generatedAt),
      priority: '0.8',
    });

    year.locations.forEach((location) => {
      const locationLastMod = computeLatestCollectionUpdate(location) ?? payload.generatedAt;
      entries.push({
        loc: buildUrl(baseUrl, year.label, location.slug),
        lastmod: formatDateForSitemap(locationLastMod),
        priority: '0.7',
      });
    });
  });

  return entries;
}

function toSitemapXml(entries: SitemapEntry[]) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  entries.forEach((entry) => {
    lines.push('  <url>');
    lines.push(`    <loc>${entry.loc}</loc>`);
    if (entry.lastmod) {
      lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    }
    if (entry.priority) {
      lines.push(`    <priority>${entry.priority}</priority>`);
    }
    lines.push('  </url>');
  });

  lines.push('</urlset>');
  lines.push('');

  return lines.join('\n');
}

async function writeSitemap(xml: string) {
  const outputDir = path.resolve(process.cwd(), 'public');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'sitemap.xml');
  await writeFile(outputPath, xml, 'utf-8');
  return outputPath;
}

async function main() {
  try {
    const baseUrl = getBaseUrl();
    const payload = await readYearLocationPayload();
    const entries = createSitemapEntries(baseUrl, payload);
    const xml = toSitemapXml(entries);
    const outputPath = await writeSitemap(xml);
    console.log(`✅ Sitemap generated at ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
