/**
 * Integration Test: Homepage year timeline navigation + Brand & Geometric Pattern
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
}));

// Mock years query to avoid hitting Prisma/unstable_cache during tests
jest.mock('@/lib/queries/years', () => ({
  getPublishedYears: jest.fn(async () => ([
    { id: '1', label: '2024', order_index: '2024.0', status: 'published', created_at: '', updated_at: '' },
    { id: '2', label: '2023', order_index: '2023.0', status: 'published', created_at: '', updated_at: '' },
  ])),
}));

describe('Integration: Homepage', () => {
  const loadPage = async () => (await import('../../src/app/(site)/page')).default;

  it('renders brand at top-left (small) and header landmark', async () => {
  const HomePage = await loadPage();
  render(await HomePage());

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass(/top|left|fixed/);

    const brand = within(header).getByText(/utoa|Utoa Photography/i);
    expect(brand).toBeInTheDocument();
  });

  it('shows geometric pattern on the right with decorative a11y', async () => {
  const HomePage = await loadPage();
  render(await HomePage());

    const pattern = screen.getByTestId('hero-geometric');
    expect(pattern).toBeInTheDocument();
    expect(pattern).toHaveClass(/right|absolute|fixed/);
    expect(pattern).toHaveAttribute('aria-hidden', 'true');
    // Decorative only; no role or label required
  });

  it('lists years as links newest-first and clickable', async () => {
  const HomePage = await loadPage();
  render(await HomePage());

    const grid = await screen.findByTestId('years-grid');
    expect(grid).toBeInTheDocument();
    const yearBoxes = await screen.findAllByTestId('year-box');
    expect(yearBoxes.length).toBeGreaterThan(0);
    const firstLink = yearBoxes[0].closest('a');
    expect(firstLink).toHaveAttribute('href', '/2024');
  });

  it('year boxes maintain square aspect class', async () => {
  const HomePage = await loadPage();
  render(await HomePage());
    const firstBox = (await screen.findAllByTestId('year-box'))[0];
    const inner = firstBox.querySelector('.aspect-square');
    expect(inner).toBeTruthy();
  });
});
