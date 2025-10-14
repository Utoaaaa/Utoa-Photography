/**
 * Integration Test: Homepage hero + navigation surface
 */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

const mockPayload = {
  generatedAt: '2025-10-10T00:00:00.000Z',
  years: [
    {
      id: '2026',
      label: '2026',
      orderIndex: '000001',
      status: 'published',
      locations: [
        {
          id: 'summit-lines',
          yearId: '2026',
          slug: 'summit-lines-26',
          name: 'Summit Lines',
          summary: 'Ridge-line portraits above the clouds.',
          coverAssetId: null,
          orderIndex: '0001',
          collectionCount: 2,
          collections: [],
        },
      ],
    },
    {
      id: '2025',
      label: '2025',
      orderIndex: '000002',
      status: 'published',
      locations: [],
    },
  ],
};

jest.mock('@/lib/year-location', () => ({
  loadYearLocationData: jest.fn(async () => mockPayload),
}));

describe('Integration: Homepage hero + navigation', () => {
  const loadPage = async () => (await import('../../src/app/(site)/page')).default;

  it('renders brand header anchored left with banner landmark', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('fixed');
    expect(header).toHaveClass('top-0');
    expect(header).toHaveClass('left-0');
    expect(within(header).getByText(/Utoa/i)).toBeInTheDocument();
    expect(within(header).getByText(/Photography/i)).toBeInTheDocument();
  });

  it('displays hero headline and decorative camera animation', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    expect(screen.getByRole('heading', { level: 2, name: /Moments in/i })).toBeInTheDocument();
    const animation = screen.getByTestId('camera-wire-animation');
    expect(animation).toBeInTheDocument();
  });

  it('renders year sections with headings and counts', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    expect(sections).toHaveLength(2);

    const firstHeading = within(sections[0]).getByRole('heading', { level: 2, name: '2026' });
    const firstSummary = within(sections[0]).getByText(/1 個地點/);
    expect(firstHeading).toBeInTheDocument();
    expect(firstSummary).toBeInTheDocument();

    const secondHeading = within(sections[1]).getByRole('heading', { level: 2, name: '2025' });
    expect(secondHeading).toBeInTheDocument();
  });

  it('shows location cards within each section and empty state when no locations', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    const firstSectionCards = within(sections[0]).getAllByTestId('location-card');
    expect(firstSectionCards).toHaveLength(1);
    expect(within(firstSectionCards[0]).getByText('Summit Lines')).toBeInTheDocument();

    const secondSectionEmpty = within(sections[1]).getByTestId('empty-locations');
    expect(secondSectionEmpty).toHaveTextContent('敬請期待');
  });
});
