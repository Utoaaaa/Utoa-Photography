/**
 * Integration Test: Homepage brand framing and navigation states
 */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

const mockLoadYearLocationData = jest.fn();

jest.mock('@/lib/year-location', () => ({
  loadYearLocationData: () => mockLoadYearLocationData(),
}));

const basePayload = {
  generatedAt: '2025-10-10T00:00:00.000Z',
  years: [
    {
      id: 'year-2026',
      label: '2026',
      orderIndex: '000001',
      status: 'published',
      locations: [
        {
          id: 'loc-summit-26',
          yearId: 'year-2026',
          slug: 'summit-26',
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
      id: 'year-2025',
      label: '2025',
      orderIndex: '000002',
      status: 'published',
      locations: [],
    },
  ],
};

describe('Integration: Homepage hero + navigation states', () => {
  beforeEach(() => {
    mockLoadYearLocationData.mockResolvedValue(basePayload);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const loadPage = async () => (await import('../../src/app/(site)/page')).default;

  it('renders fixed brand header in banner landmark', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('fixed');
    expect(header).toHaveClass('top-0');
    expect(header).toHaveClass('left-0');
    expect(within(header).getByText('Utoa')).toBeInTheDocument();
    expect(within(header).getByText('Photography')).toBeInTheDocument();
  });

  it('shows hero headline with fade-in wrapper and camera animation', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    expect(screen.getByRole('heading', { level: 2, name: /Moments in/i })).toBeInTheDocument();
    expect(screen.getByTestId('fade-in-text')).toBeInTheDocument();
    expect(screen.getByTestId('camera-wire-animation')).toBeInTheDocument();
  });

  it('lists year sections in chronological order', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    const headings = sections.map((section) => within(section).getByRole('heading', { level: 2 }).textContent);

    expect(headings).toEqual(['2026', '2025']);
  });

  it('shows empty state within section when year has no locations', async () => {
    const HomePage = await loadPage();
    render(await HomePage());

    const sections = await screen.findAllByTestId('year-section');
    const emptyState = within(sections[1]).getByTestId('empty-locations');
    expect(emptyState).toHaveTextContent('敬請期待');
  });

  it('displays empty years fallback when no published years exist', async () => {
    mockLoadYearLocationData.mockResolvedValueOnce({ generatedAt: '', years: [] });

    const HomePage = await loadPage();
    render(await HomePage());

    expect(await screen.findByTestId('empty-years')).toBeInTheDocument();
  });

  it('recovers from data load failure by showing empty fallback', async () => {
    mockLoadYearLocationData.mockRejectedValueOnce(new Error('boom'));

    const HomePage = await loadPage();
    render(await HomePage());

    expect(await screen.findByTestId('empty-years')).toBeInTheDocument();
  });
});