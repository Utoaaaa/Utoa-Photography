import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { buildCollectionHref, buildLocationHref } from '../../src/lib/site-paths';
import type {
  LocationCollectionSummary,
  LocationEntry,
  YearEntry,
  YearLocationPayload,
} from '../../src/lib/year-location';

type RouteSample = {
  hasLiveData: boolean;
  hasCollection: boolean;
  raw: {
    year: Pick<YearEntry, 'id' | 'label' | 'orderIndex' | 'status'> | null;
    location: Pick<LocationEntry, 'id' | 'slug' | 'name' | 'orderIndex' | 'collectionCount'> | null;
    collection: Pick<LocationCollectionSummary, 'id' | 'slug' | 'title' | 'orderIndex' | 'photoCount'> | null;
  };
  encoded: {
    year: string | null;
    location: string | null;
    collection: string | null;
  };
  paths: {
    productionLocation: string | null;
    productionCollection: string | null;
    classicLocation: string | null;
    classicCollection: string | null;
  };
};

const EVIDENCE_DIR = path.resolve('.sisyphus/evidence');
const LIVE_ROUTE_SAMPLE_PATH = path.join(EVIDENCE_DIR, 'live-route-sample.json');
const CLASSIC_BASE_PATH = '/classic';
const ROUTE_SAMPLE_JSON_PREFIX = '__ROUTE_SAMPLE_JSON__';

let routeSample: RouteSample;

function loadYearLocationDataForSample(): YearLocationPayload {
  const script = `
    const { loadYearLocationData } = require('./src/lib/year-location.ts');
    loadYearLocationData()
      .then((data) => console.log('${ROUTE_SAMPLE_JSON_PREFIX}' + JSON.stringify(data)))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  `;
  const output = execFileSync(process.execPath, ['-r', 'ts-node/register/transpile-only', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS', moduleResolution: 'node' }),
    },
  });
  const jsonLine = output
    .split('\n')
    .find((line) => line.startsWith(ROUTE_SAMPLE_JSON_PREFIX));

  expect(jsonLine, 'loadYearLocationData() should emit route sample JSON').toBeTruthy();
  return JSON.parse(jsonLine!.slice(ROUTE_SAMPLE_JSON_PREFIX.length)) as YearLocationPayload;
}

function firstPublishedYearWithLocation(years: YearEntry[]) {
  return years
    .filter((year) => year.status === 'published')
    .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex))
    .find((year) => year.locations.length > 0) ?? null;
}

async function writeLiveRouteSample(): Promise<RouteSample> {
  const data = loadYearLocationDataForSample();
  const year = firstPublishedYearWithLocation(data.years);
  const location = year?.locations[0] ?? null;
  const collection = location?.collections[0] ?? null;

  const sample: RouteSample = {
    hasLiveData: Boolean(year && location),
    hasCollection: Boolean(collection),
    raw: {
      year: year
        ? {
            id: year.id,
            label: year.label,
            orderIndex: year.orderIndex,
            status: year.status,
          }
        : null,
      location: location
        ? {
            id: location.id,
            slug: location.slug,
            name: location.name,
            orderIndex: location.orderIndex,
            collectionCount: location.collectionCount,
          }
        : null,
      collection: collection
        ? {
            id: collection.id,
            slug: collection.slug,
            title: collection.title,
            orderIndex: collection.orderIndex,
            photoCount: collection.photoCount,
          }
        : null,
    },
    encoded: {
      year: year ? encodeURIComponent(year.label) : null,
      location: location ? encodeURIComponent(location.slug) : null,
      collection: collection ? encodeURIComponent(collection.slug) : null,
    },
    paths: {
      productionLocation: year && location ? buildLocationHref(year.label, location.slug) : null,
      productionCollection: year && location && collection ? buildCollectionHref(year.label, location.slug, collection.slug) : null,
      classicLocation: year && location ? buildLocationHref(year.label, location.slug, CLASSIC_BASE_PATH) : null,
      classicCollection:
        year && location && collection
          ? buildCollectionHref(year.label, location.slug, collection.slug, CLASSIC_BASE_PATH)
          : null,
    },
  };

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const sampleJson = `${JSON.stringify(sample, null, 2)}\n`;
  if (!fs.existsSync(LIVE_ROUTE_SAMPLE_PATH) || fs.readFileSync(LIVE_ROUTE_SAMPLE_PATH, 'utf8') !== sampleJson) {
    fs.writeFileSync(LIVE_ROUTE_SAMPLE_PATH, sampleJson, 'utf8');
  }
  return sample;
}

function requirePath(value: string | null, name: keyof RouteSample['paths']) {
  expect(value, `Expected live route sample path ${name} to exist`).not.toBeNull();
  return value as string;
}

function pathSuffixPattern(routePath: string) {
  return new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

async function clickLinkAndExpectPath(page: Page, link: ReturnType<Page['locator']>, routePath: string) {
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', routePath);
  await page.locator('[data-loader-active="true"]').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await link.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL(pathSuffixPattern(routePath), { timeout: 10_000 }),
    link.click(),
  ]);
}

async function expectHomepageEmptyState(page: Page) {
  await expect(page.getByTestId('empty-years').or(page.getByTestId('empty-locations')).first()).toBeVisible();
}

async function expectProductionLocationNavigation(page: Page) {
  const locationPath = requirePath(routeSample.paths.productionLocation, 'productionLocation');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);

  const firstLocation = page.locator(`[data-testid="animated-location-card"][href="${locationPath}"]`).first();
  await clickLinkAndExpectPath(page, firstLocation, locationPath);
  await expect(page.getByTestId('animated-location-collections')).toBeVisible();
}

test.beforeAll(async () => {
  routeSample = await writeLiveRouteSample();
});

test('production homepage navigates to first live location and collection when data exists', async ({ page }) => {
  if (!routeSample.hasLiveData) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expectHomepageEmptyState(page);
    return;
  }

  await expectProductionLocationNavigation(page);

  if (!routeSample.hasCollection) {
    await expect(page.getByTestId('animated-empty-collections')).toBeVisible();
    return;
  }

  const collectionPath = requirePath(routeSample.paths.productionCollection, 'productionCollection');
  const firstCollection = page.locator(`[data-testid="animated-collection-card"][href="${collectionPath}"]`).first();
  await clickLinkAndExpectPath(page, firstCollection, collectionPath);
  await expect(page.getByTestId('animated-collection-shell')).toBeVisible();
  await expect(page.getByTestId('photo-viewer').or(page.getByTestId('empty-photos')).first()).toBeVisible();
});

test('classic homepage navigates to first live location and collection when data exists', async ({ page }) => {
  await page.goto('/classic', { waitUntil: 'domcontentloaded' });

  if (!routeSample.hasLiveData) {
    await expectHomepageEmptyState(page);
    return;
  }

  const locationPath = requirePath(routeSample.paths.classicLocation, 'classicLocation');
  const firstLocation = page.locator(`[data-testid="location-card"][href="${locationPath}"]`).first();
  await clickLinkAndExpectPath(page, firstLocation, locationPath);
  await expect(page.getByTestId('location-collections')).toBeVisible();

  if (!routeSample.hasCollection) {
    await expect(page.getByTestId('location-empty')).toBeVisible();
    return;
  }

  const collectionPath = requirePath(routeSample.paths.classicCollection, 'classicCollection');
  const firstCollection = page.locator(`[data-testid="collection-card"][href="${collectionPath}"]`).first();
  await clickLinkAndExpectPath(page, firstCollection, collectionPath);
  await expect(page.getByTestId('photo-viewer-container')).toBeVisible();
  await expect(page.getByTestId('photo-viewer').or(page.getByTestId('empty-photos')).first()).toBeVisible();
});

test('invalid production and classic routes return 404', async ({ page }) => {
  const invalidRoutes = [
    '/__missing-year__/__missing-location__',
    '/__missing-year__/__missing-location__/__missing-collection__',
    '/classic/__missing-year__/__missing-location__',
    '/classic/__missing-year__/__missing-location__/__missing-collection__',
  ];

  for (const route of invalidRoutes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${route} should return HTTP 404`).toBe(404);
  }

  if (routeSample.hasCollection) {
    const wrongClassicCollectionRoute = `/classic/${routeSample.encoded.year}/__wrong-location__/${routeSample.encoded.collection}`;
    const response = await page.goto(wrongClassicCollectionRoute, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${wrongClassicCollectionRoute} should reject mismatched location slug`).toBe(404);
  }
});

test('reduced-motion emulation does not block primary production navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  if (!routeSample.hasLiveData) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expectHomepageEmptyState(page);
    return;
  }

  await expectProductionLocationNavigation(page);
});
