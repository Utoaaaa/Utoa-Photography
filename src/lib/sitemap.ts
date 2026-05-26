import type { LocationEntry, YearEntry, YearLocationPayload } from './year-location';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  priority?: string;
}

export function formatDateForSitemap(value?: string | null) {
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

  return timestamps.reduce((acc, current) => {
    return new Date(current).getTime() > new Date(acc).getTime() ? current : acc;
  });
}

function buildUrl(baseUrl: string, ...segments: string[]) {
  if (segments.length === 0) {
    return `${baseUrl}/`;
  }

  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
  return `${baseUrl}/${encodedPath}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createSitemapEntries(baseUrl: string, payload: YearLocationPayload): SitemapEntry[] {
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

    year.locations.forEach((location) => {
      const locationLastMod = computeLatestCollectionUpdate(location) ?? payload.generatedAt;
      entries.push({
        loc: buildUrl(baseUrl, year.label, location.slug),
        lastmod: formatDateForSitemap(locationLastMod),
        priority: '0.8',
      });

      location.collections.forEach((collection) => {
        entries.push({
          loc: buildUrl(baseUrl, year.label, location.slug, collection.slug),
          lastmod: formatDateForSitemap(collection.updatedAt ?? collection.publishedAt ?? payload.generatedAt),
          priority: '0.7',
        });
      });
    });
  });

  return entries;
}

export function toSitemapXml(entries: SitemapEntry[]) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  entries.forEach((entry) => {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    if (entry.priority) {
      lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    }
    lines.push('  </url>');
  });

  lines.push('</urlset>');
  lines.push('');

  return lines.join('\n');
}
