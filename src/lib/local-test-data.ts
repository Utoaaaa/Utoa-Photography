import type { YearEntry, YearLocationPayload, YearNavEntry } from './year-location';
import type { CollectionViewerPayload } from './viewer/collection';

export const localTestDataForced = process.env.UTOA_ENABLE_LOCAL_TEST_DATA === 'true';

export const localTestDataEnabled = localTestDataForced
  || (process.env.NODE_ENV !== 'production' && process.env.UTOA_DISABLE_LOCAL_TEST_DATA !== 'true');

const generatedAt = '2026-05-19T00:00:00.000Z';

const localYearLocationData: YearLocationPayload = {
  generatedAt,
  years: [
    {
      id: 'local-year-2024',
      label: '2024',
      orderIndex: '000001',
      status: 'published',
      locations: [
        {
          id: 'local-location-city-lights-24',
          yearId: 'local-year-2024',
          slug: 'city-lights-24',
          name: 'City Lights',
          summary: '本地測試資料：霓虹、街角與夜色中的城市故事。',
          coverAssetId: 'local-test-image-city-cover',
          orderIndex: '000001',
          collectionCount: 1,
          collections: [
            {
              id: 'local-collection-urban-stories',
              slug: 'urban-stories',
              title: 'Urban Stories',
              summary: '本地測試資料：讓作品集頁在沒有資料庫或 R2 時仍可檢視版面。',
              photoCount: 5,
              coverAssetId: 'local-test-image-urban-cover',
              coverAssetWidth: 1600,
              coverAssetHeight: 1067,
              orderIndex: '000001',
              capturedAt: '2024-06-01T00:00:00.000Z',
              publishedAt: '2024-06-01T00:00:00.000Z',
              updatedAt: generatedAt,
            },
          ],
        },
        {
          id: 'local-location-northern-peaks-24',
          yearId: 'local-year-2024',
          slug: 'northern-peaks-24',
          name: 'Northern Peaks',
          summary: '本地測試資料：山脊、雲霧與高海拔光線。',
          coverAssetId: 'local-test-image-peaks-cover',
          orderIndex: '000002',
          collectionCount: 1,
          collections: [
            {
              id: 'local-collection-spring-vibes',
              slug: 'spring-vibes',
              title: 'Spring Vibes',
              summary: '本地測試資料：春天色彩與郊外散步。',
              photoCount: 3,
              coverAssetId: 'local-test-image-spring-cover',
              coverAssetWidth: 1600,
              coverAssetHeight: 1200,
              orderIndex: '000001',
              capturedAt: '2024-03-15T00:00:00.000Z',
              publishedAt: '2024-03-15T00:00:00.000Z',
              updatedAt: generatedAt,
            },
          ],
        },
      ],
    },
    {
      id: 'local-year-2023',
      label: '2023',
      orderIndex: '000002',
      status: 'published',
      locations: [
        {
          id: 'local-location-harbor-glow-23',
          yearId: 'local-year-2023',
          slug: 'harbor-glow-23',
          name: 'Harbor Glow',
          summary: '本地測試資料：港邊金色時刻。',
          coverAssetId: 'local-test-image-harbor-cover',
          orderIndex: '000001',
          collectionCount: 1,
          collections: [
            {
              id: 'local-collection-portraits',
              slug: 'portraits',
              title: 'Portraits',
              summary: '本地測試資料：人像與環境肖像。',
              photoCount: 2,
              coverAssetId: 'local-test-image-portrait-cover',
              coverAssetWidth: 1200,
              coverAssetHeight: 1600,
              orderIndex: '000001',
              capturedAt: '2023-08-20T00:00:00.000Z',
              publishedAt: '2023-08-20T00:00:00.000Z',
              updatedAt: generatedAt,
            },
          ],
        },
      ],
    },
  ],
};

const collectionViewerData: CollectionViewerPayload[] = [
  {
    year: { id: 'local-year-2024', label: '2024' },
    location: {
      id: 'local-location-city-lights-24',
      slug: 'city-lights-24',
      name: 'City Lights',
      summary: '本地測試資料：霓虹、街角與夜色中的城市故事。',
    },
    collection: {
      id: 'local-collection-urban-stories',
      slug: 'urban-stories',
      title: 'Urban Stories',
      summary: '本地測試資料：讓作品集頁在沒有資料庫或 R2 時仍可檢視版面。',
    },
    photos: [
      { id: 'local-test-image-urban-01', alt: 'Local test urban street at dusk', caption: '本地測試照片 01', width: 1600, height: 1067 },
      { id: 'local-test-image-urban-02', alt: 'Local test neon storefront', caption: '本地測試照片 02', width: 1200, height: 1600 },
      { id: 'local-test-image-urban-03', alt: 'Local test crosswalk lights', caption: '本地測試照片 03', width: 1600, height: 1200 },
      { id: 'local-test-image-urban-04', alt: 'Local test late-night alley', caption: '本地測試照片 04', width: 1600, height: 1067 },
      { id: 'local-test-image-urban-portrait-05', alt: 'Local test vertical portrait frame', caption: '直式測試照片 05', width: 1080, height: 1620 },
    ],
  },
  {
    year: { id: 'local-year-2024', label: '2024' },
    location: {
      id: 'local-location-northern-peaks-24',
      slug: 'northern-peaks-24',
      name: 'Northern Peaks',
      summary: '本地測試資料：山脊、雲霧與高海拔光線。',
    },
    collection: {
      id: 'local-collection-spring-vibes',
      slug: 'spring-vibes',
      title: 'Spring Vibes',
      summary: '本地測試資料：春天色彩與郊外散步。',
    },
    photos: [
      { id: 'local-test-image-spring-01', alt: 'Local test spring path', caption: '本地測試照片 01', width: 1600, height: 1200 },
      { id: 'local-test-image-spring-02', alt: 'Local test hillside light', caption: '本地測試照片 02', width: 1600, height: 1067 },
      { id: 'local-test-image-spring-03', alt: 'Local test flower detail', caption: '本地測試照片 03', width: 1200, height: 1600 },
    ],
  },
  {
    year: { id: 'local-year-2023', label: '2023' },
    location: {
      id: 'local-location-harbor-glow-23',
      slug: 'harbor-glow-23',
      name: 'Harbor Glow',
      summary: '本地測試資料：港邊金色時刻。',
    },
    collection: {
      id: 'local-collection-portraits',
      slug: 'portraits',
      title: 'Portraits',
      summary: '本地測試資料：人像與環境肖像。',
    },
    photos: [
      { id: 'local-test-image-portrait-01', alt: 'Local test environmental portrait', caption: '本地測試照片 01', width: 1200, height: 1600 },
      { id: 'local-test-image-portrait-02', alt: 'Local test harbor portrait', caption: '本地測試照片 02', width: 1600, height: 1067 },
    ],
  },
];

function cloneYear(year: YearEntry): YearEntry {
  return {
    ...year,
    locations: year.locations.map((location) => ({
      ...location,
      collections: location.collections.map((collection) => ({ ...collection })),
    })),
  };
}

function cloneCollectionViewerPayload(payload: CollectionViewerPayload): CollectionViewerPayload {
  return {
    year: { ...payload.year },
    location: payload.location ? { ...payload.location } : null,
    collection: { ...payload.collection },
    photos: payload.photos.map((photo) => ({ ...photo })),
  };
}

export function getLocalYearLocationData(): YearLocationPayload {
  return {
    generatedAt: localYearLocationData.generatedAt,
    years: localYearLocationData.years.map(cloneYear),
  };
}

export function getLocalYearByLabel(label: string): YearEntry | null {
  const year = localYearLocationData.years.find((entry) => entry.label === label);
  return year ? cloneYear(year) : null;
}

export function getLocalLocationByYearAndSlug(
  label: string,
  slug: string,
): { year: YearEntry; location: YearEntry['locations'][number] } | null {
  const year = getLocalYearByLabel(label);
  if (!year) return null;

  const location = year.locations.find((entry) => entry.slug === slug);
  return location ? { year, location } : null;
}

export function getLocalYearLocationNavData(): YearNavEntry[] {
  return localYearLocationData.years.map((year) => ({
    id: year.id,
    label: year.label,
    orderIndex: year.orderIndex,
    status: year.status,
    locations: year.locations.map((location) => ({
      id: location.id,
      slug: location.slug,
      name: location.name,
      orderIndex: location.orderIndex,
    })),
  }));
}

export function getLocalCollectionForViewer(params: {
  yearLabel: string;
  slug: string;
}): CollectionViewerPayload | null {
  const collection = collectionViewerData.find(
    (entry) => entry.year.label === params.yearLabel && entry.collection.slug === params.slug,
  );
  return collection ? cloneCollectionViewerPayload(collection) : null;
}
