import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getSiteUrl } from '../src/lib/site-url';
import { createSitemapEntries, toSitemapXml } from '../src/lib/sitemap';
import { loadYearLocationData } from '../src/lib/year-location';
import type { YearLocationPayload } from '../src/lib/year-location';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

async function readYearLocationPayload(): Promise<YearLocationPayload> {
  const dataPath = path.resolve(process.cwd(), 'public', 'data', 'year-location.json');
  let snapshot: YearLocationPayload | null = null;

  try {
    const fileContent = await readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(fileContent) as YearLocationPayload;

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.years)) {
      throw new Error('Invalid year-location payload: missing years array');
    }

    if (!ISO_DATE_REGEX.test(parsed.generatedAt)) {
      throw new Error('Invalid year-location payload: generatedAt must be ISO string');
    }

    snapshot = parsed;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }

    console.warn('[generate-sitemap] year-location.json not found, using live data.');
  }

  try {
    const livePayload = await loadYearLocationData();
    if (livePayload.years.length > 0) {
      if (snapshot) {
        console.warn('[generate-sitemap] Using live year-location data instead of snapshot.');
      }
      return livePayload;
    }
  } catch (error) {
    if (!snapshot) {
      throw error;
    }
    console.warn(
      '[generate-sitemap] Failed to load live year-location data, falling back to snapshot:',
      error instanceof Error ? error.message : error
    );
  }

  if (snapshot) {
    if (snapshot.years.length === 0) {
      console.warn('[generate-sitemap] Live data and snapshot are empty; writing homepage-only sitemap.');
    }
    return snapshot;
  }

  try {
    return await loadYearLocationData();
  } catch {
    console.warn('[generate-sitemap] Failed to load live data; writing homepage-only sitemap.');
    return {
      generatedAt: new Date().toISOString(),
      years: [],
    };
  }
}

async function writeSitemap(xml: string) {
  const outputDir = path.resolve(process.cwd(), 'public');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'sitemap-static.xml');
  await writeFile(outputPath, xml, 'utf-8');
  return outputPath;
}

async function main() {
  try {
    const baseUrl = getSiteUrl();
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
