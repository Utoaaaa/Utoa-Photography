/**
 * Legacy Integration Test (skipped): Homepage year timeline navigation + Brand & Geometric Pattern
 * This file preserves the older assertions but is skipped to avoid SWC/App Router issues.
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock years query to avoid hitting Prisma/unstable_cache during tests
jest.mock('@/lib/queries/years', () => ({
  getPublishedYears: jest.fn(async () => ([
    { id: '1', label: '2024', order_index: '2024.0', status: 'published', created_at: '', updated_at: '' },
    { id: '2', label: '2023', order_index: '2023.0', status: 'published', created_at: '', updated_at: '' },
  ])),
}));

describe('Integration: Homepage year timeline navigation + Brand & Patterns (legacy)', () => {
  const mockYearsData = [
    {
      id: '1',
      label: '2024',
      order_index: '2024.0',
      status: 'published',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      label: '2023',
      order_index: '2023.0',
      status: 'published',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '3',
      label: '2022',
      order_index: '2022.0',
      status: 'published',
      created_at: '2022-01-01T00:00:00Z',
      updated_at: '2022-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    // Mock fetch to return years data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockYearsData),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should position brand and geometric pattern', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
    render(await HomePage());

  const header = screen.getByRole('banner');
  expect(header).toBeInTheDocument();
  const brandElement = within(header).getByTestId('brand');
  expect(brandElement).toBeInTheDocument();

    const geometricPattern = screen.getByTestId('hero-geometric');
    expect(geometricPattern).toBeInTheDocument();
  });
});
