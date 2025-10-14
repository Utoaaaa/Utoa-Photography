/**
 * Integration Test: Homepage static year/location data rendering
 */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

const mockPayload = {
  generatedAt: '2025-10-10T00:00:00.000Z',
  years: [
    {
      id: 'year-2024',
      label: '2024',
      orderIndex: '000002',
      status: 'published',
      locations: [
        {
          id: 'loc-city-lights-24',
          yearId: 'year-2024',
          slug: 'city-lights-24',
          name: 'City Lights',
          summary: 'Neon street portraits after rainfall.',
          coverAssetId: 'asset-city',
          orderIndex: '0001',
          collectionCount: 1,
          collections: [
            {
              id: 'col-urban-stories',
              slug: 'urban-stories',
              title: 'Urban Stories',
              summary: 'Life in the city after dusk.',
              coverAssetId: 'asset-urban',
              orderIndex: '0001',
              publishedAt: '2024-06-15T00:00:00.000Z',
              updatedAt: '2024-07-20T00:00:00.000Z',
            },
          ],
        },
      ],
    },
    {
      id: 'year-2025',
      label: '2025',
      orderIndex: '000003',
      status: 'published',
      locations: [
        {
          id: 'loc-northern-lights-25',
          yearId: 'year-2025',
          slug: 'northern-lights-25',
          name: 'Northern Lights',
          summary: 'Aurora photography expedition in Finnish Lapland.',
          coverAssetId: 'asset-northern',
          orderIndex: '0001',
          collectionCount: 2,
          collections: [
            {
              id: 'col-night-sky',
              slug: 'night-sky',
              title: 'Night Sky Stories',
              summary: 'Documenting aurora dances.',
              coverAssetId: 'asset-aurora',
              orderIndex: '0001',
              publishedAt: '2025-03-01T00:00:00.000Z',
              updatedAt: '2025-04-01T00:00:00.000Z',
            },
          ],
        },
      ],
    },
    {
      id: 'year-2023',
      label: '2023',
      orderIndex: '000004',
      status: 'published',
      locations: [],
    },
  ],
};

jest.mock('@/lib/year-location', () => ({
  loadYearLocationData: jest.fn(async () => mockPayload),
}));

describe('Integration: Homepage year/location static data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const loadPage = async () => (await import('../../src/app/(site)/page')).default;

  it('renders a section for each published year with heading and locations', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    expect(sections).toHaveLength(3);

    const firstSectionHeading = within(sections[0]).getByRole('heading', { level: 2, name: '2024' });
    expect(firstSectionHeading).toBeInTheDocument();

    const lastSectionHeading = within(sections[2]).getByRole('heading', { level: 2, name: '2023' });
    expect(lastSectionHeading).toBeInTheDocument();
  });

  it('shows location cards for each year with published locations', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');

    const firstYearCards = within(sections[0]).getAllByTestId('location-card');
    expect(firstYearCards).toHaveLength(1);
    expect(within(firstYearCards[0]).getByText('City Lights')).toBeInTheDocument();

    const secondYearCards = within(sections[1]).getAllByTestId('location-card');
    expect(secondYearCards).toHaveLength(1);
    expect(within(secondYearCards[0]).getByText('Northern Lights')).toBeInTheDocument();
  });

  it('shows empty state when a year has no locations', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    const emptySection = sections.find((section) => within(section).queryByTestId('empty-locations'));

    expect(emptySection).toBeDefined();
    if (emptySection) {
      expect(within(emptySection).getByTestId('empty-locations')).toBeInTheDocument();
      expect(within(emptySection).getByText(/地點即將揭曉/)).toBeInTheDocument();
    }
  });
});
