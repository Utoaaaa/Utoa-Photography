/**
 * Integration Test: Location detail routing + empty states
 */
import '@testing-library/jest-dom';
import { render, screen, within, cleanup } from '@testing-library/react';

interface LocationCollectionSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverAssetWidth: number | null;
  coverAssetHeight: number | null;
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

let mockPayload: YearLocationPayload;

const loadYearLocationDataMock = jest.fn(async () => mockPayload);
const getLocationByYearAndSlugMock = jest.fn(async (label: string, slug: string) => {
  if (!mockPayload) return null;
  const year = mockPayload.years.find((entry) => entry.label === label && entry.status === 'published');
  if (!year) return null;
  const location = year.locations.find((entry) => entry.slug === slug);
  if (!location) return null;
  return { year, location };
});

jest.mock('@/lib/year-location', () => ({
  loadYearLocationData: () => loadYearLocationDataMock(),
  getLocationByYearAndSlug: (label: string, slug: string) => getLocationByYearAndSlugMock(label, slug),
}));

describe('Integration: Location detail flow', () => {
  afterEach(() => {
    cleanup();
    loadYearLocationDataMock.mockClear();
    getLocationByYearAndSlugMock.mockClear();
  });

  const loadHomepage = async () => (await import('../../src/app/(site)/page')).default;
  const loadLocationPage = async () => (await import('../../src/app/(site)/[year]/[location]/page')).default;

  it('links homepage location cards to detail page and renders collections', async () => {
    mockPayload = {
      generatedAt: '2025-10-10T00:00:00.000Z',
      years: [
        {
          id: 'year-2024',
          label: '2024',
          orderIndex: '000001',
          status: 'published',
          locations: [
            {
              id: 'loc-city-lights-24',
              yearId: 'year-2024',
              slug: 'city-lights-24',
              name: 'City Lights',
              summary: 'Neon street portraits after rainfall.',
              coverAssetId: null,
              orderIndex: '0001',
              collectionCount: 1,
              collections: [
                {
                  id: 'col-urban-stories',
                  slug: 'urban-stories',
                  title: 'Urban Stories',
                  summary: 'Life in the city after dusk.',
                  coverAssetWidth: null,
                  coverAssetHeight: null,
                  coverAssetId: null,
                  orderIndex: '0001',
                  publishedAt: '2024-06-15T00:00:00.000Z',
                  updatedAt: '2024-07-20T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
    };

    const HomePage = await loadHomepage();
    render(await HomePage());

    const cards = await screen.findAllByTestId('location-card');
    expect(cards).toHaveLength(1);

  const viewLink = cards[0];
    expect(viewLink).toHaveAttribute('href', '/2024/city-lights-24');
    expect(viewLink).toHaveAccessibleName(/查看作品/i);

    const LocationPage = await loadLocationPage();
    render(
      await LocationPage({
        params: Promise.resolve({
          year: '2024',
          location: 'city-lights-24',
        }),
      }),
    );

    expect(getLocationByYearAndSlugMock).toHaveBeenCalledWith('2024', 'city-lights-24');
    expect(screen.getByRole('heading', { level: 1, name: 'City Lights' })).toBeInTheDocument();
    expect(screen.getByTestId('collection-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('collection-card')).toHaveLength(1);
    expect(screen.getByText(/Urban Stories/)).toBeInTheDocument();
  });

  it('shows empty state and back link when location has no collections', async () => {
    mockPayload = {
      generatedAt: '2025-10-10T00:00:00.000Z',
      years: [
        {
          id: 'year-2024',
          label: '2024',
          orderIndex: '000001',
          status: 'published',
          locations: [
            {
              id: 'loc-northern-peaks-24',
              yearId: 'year-2024',
              slug: 'northern-peaks-24',
              name: 'Northern Peaks',
              summary: 'High-altitude adventures across alpine ridges.',
              coverAssetId: null,
              orderIndex: '0001',
              collectionCount: 0,
              collections: [],
            },
          ],
        },
      ],
    };

    const LocationPage = await loadLocationPage();
    render(
      await LocationPage({
        params: Promise.resolve({
          year: '2024',
          location: 'northern-peaks-24',
        }),
      }),
    );

    const emptyState = screen.getByTestId('location-empty');
    expect(emptyState).toBeInTheDocument();
    const backLink = within(emptyState).getByRole('link', { name: /返回 2024 年其他地點/i });
    expect(backLink).toHaveAttribute('href', '/2024');
  });
});
