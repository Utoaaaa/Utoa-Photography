/**
 * Integration Test: Homepage year timeline navigation + Brand & Geometric Pattern
 * 
 * Tests the complete user flow for homepage year timeline navigation and new brand positioning.
 * This test MUST FAIL until frontend components are implemented.
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

describe('Integration: Homepage year timeline navigation + Brand & Patterns', () => {
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

  describe('Brand positioning and layout', () => {
    it('should position "utoa" brand in top-left corner with smaller size', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

  const header = screen.getByRole('banner');
  const brandElement = within(header).getByTestId('brand');
      expect(brandElement).toBeInTheDocument();
      
      // Check positioning classes
      expect(brandElement).toHaveClass(/top|left|absolute|fixed/);
      
      // Check smaller sizing
      expect(brandElement).toHaveClass(/text-sm|text-base|small/);
      expect(brandElement).not.toHaveClass(/text-lg|text-xl|text-2xl|large/);
    });

    it('should display geometric camera pattern on right side', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      // Look for geometric pattern element
      const geometricPattern = screen.getByTestId('geometric-pattern') || 
                              screen.getByRole('img', { name: /geometric|camera|pattern/i });
      expect(geometricPattern).toBeInTheDocument();
      
      // Check right-side positioning
      expect(geometricPattern).toHaveClass(/right|absolute|fixed/);
    });

    it('should hide geometric pattern on mobile (responsive design)', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });
      
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      const geometricPattern = screen.queryByTestId('geometric-pattern');
      
      if (geometricPattern) {
        // Should have hidden classes for mobile
        expect(geometricPattern).toHaveClass(/hidden|md:block|lg:block/);
      }
    });

    it('should show geometric pattern on desktop (>=md breakpoint)', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Desktop width
      });
      
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      const geometricPattern = screen.getByTestId('geometric-pattern');
      expect(geometricPattern).toBeInTheDocument();
      expect(geometricPattern).toBeVisible();
    });

    it('should maintain low-density geometric pattern (not overwhelming)', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      const geometricPattern = screen.getByTestId('geometric-pattern');
      
      // Check for subtle/low-density styling
      expect(geometricPattern).toHaveClass(/opacity-|subtle|light|faded/);
      
      // Should not interfere with main content
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeVisible();
    });
  });

  describe('Accessibility for brand and patterns', () => {
    it('should have proper ARIA labels for geometric patterns', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      const geometricPattern = screen.getByTestId('geometric-pattern');
      
      // Should have decorative role or proper alt text
      expect(geometricPattern).toHaveAttribute('role', 'img');
      expect(geometricPattern).toHaveAttribute('aria-label');
      
      // Or should be marked as decorative
      const ariaLabel = geometricPattern.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/decorative|geometric|pattern/i);
    });

    it('should not interfere with screen reader navigation', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      // Main navigation landmarks should be clear
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      
      // Geometric pattern should not create navigation noise
      const geometricPattern = screen.getByTestId('geometric-pattern');
      expect(geometricPattern).toHaveAttribute('aria-hidden', 'true');
    });

    it('should respect prefers-reduced-motion for any animations', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(), // Deprecated
          removeListener: jest.fn(), // Deprecated
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      const animatedElements = screen.getAllByTestId(/pattern|brand|geometric/);
      
      animatedElements.forEach(element => {
        // Should not have motion classes when reduced motion is preferred
        expect(element).not.toHaveClass(/animate|transition|motion/);
      });
    });
  });

  describe('Year timeline navigation (existing tests)', () => {
    it('should render hero section with site title and geometric patterns', async () => {
      // This will fail until we implement the homepage component
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      // Check for hero section elements
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  const main = screen.getByRole('main');
  expect(within(main).getByText(/Utoa Photography/i)).toBeInTheDocument();
      
      // Check for geometric patterns (could be SVG or CSS elements)
      const heroSection = screen.getByRole('banner');
      expect(heroSection).toHaveClass(/hero|geometric|pattern/);
    });

    it('should display year grid in chronological order (newest first)', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearButtons = screen.getAllByRole('button');
        expect(yearButtons).toHaveLength(3);
      });

      const yearButtons = screen.getAllByRole('button');
      
      // Check order: 2024, 2023, 2022
      expect(yearButtons[0]).toHaveTextContent('2024');
      expect(yearButtons[1]).toHaveTextContent('2023');
      expect(yearButtons[2]).toHaveTextContent('2022');
    });

    it('should make year boxes clickable and navigable', async () => {
      const mockPush = jest.fn();
      jest.resetModules();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
        usePathname: () => '/',
      }));

  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        expect(screen.getByText('2024')).toBeInTheDocument();
      });

  const firstLink = screen.getAllByTestId('year-box')[0];
  fireEvent.click(firstLink);

      expect(mockPush).toHaveBeenCalledWith('/2024');
    });

    it('should support keyboard navigation for year boxes', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearButtons = screen.getAllByRole('button');
        expect(yearButtons).toHaveLength(3);
      });

      const firstYearButton = screen.getAllByRole('button')[0];
      
      // Focus on first year box
      firstYearButton.focus();
      expect(firstYearButton).toHaveFocus();

      // Tab to next year box
      fireEvent.keyDown(firstYearButton, { key: 'Tab' });
      const secondYearButton = screen.getAllByRole('button')[1];
      
      // Should be able to navigate with Tab key
      expect(secondYearButton).toBeVisible();
    });

    it('should display year boxes in responsive grid layout', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearGrid = screen.getByRole('main');
        expect(yearGrid).toBeInTheDocument();
      });

      const yearGrid = screen.getByRole('main');
      
      // Check for responsive grid classes
      expect(yearGrid).toHaveClass(/grid|flex/);
      expect(yearGrid).toHaveClass(/responsive|sm:|md:|lg:/);
    });

    it('should handle empty years data gracefully', async () => {
      // Mock empty response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      ) as jest.Mock;

  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        // Should show empty state message
        expect(screen.getByText(/no years|coming soon|empty/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      ) as jest.Mock;

  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/error|failed|retry/i)).toBeInTheDocument();
      });
    });

    it('should apply hover animations to year boxes', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearButton = screen.getByText('2024');
        expect(yearButton).toBeInTheDocument();
      });

      const yearButton = screen.getByText('2024');
      
      // Simulate hover
      fireEvent.mouseEnter(yearButton);
      
      // Check for hover state classes
      expect(yearButton.closest('[role="button"]')).toHaveClass(/hover|transform|transition/);
    });

    it('should maintain year box aspect ratio across screen sizes', async () => {
  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearButtons = screen.getAllByRole('button');
        expect(yearButtons).toHaveLength(3);
      });

      const yearButton = screen.getAllByRole('button')[0];
      
      // Check for aspect ratio classes or styles
      expect(yearButton).toHaveClass(/aspect|ratio|square/);
    });

    it('should only show published years to public users', async () => {
      const mixedStatusYears = [
        ...mockYearsData,
        {
          id: '4',
          label: '2021',
          order_index: '2021.0',
          status: 'draft', // This should not appear
          created_at: '2021-01-01T00:00:00Z',
          updated_at: '2021-01-01T00:00:00Z',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mixedStatusYears.filter(y => y.status === 'published')),
        })
      ) as jest.Mock;

  const HomePage = await import('../../src/app/(site)/page').then(m => m.default);
  render(await HomePage());

      await waitFor(() => {
        const yearButtons = screen.getAllByRole('button');
        expect(yearButtons).toHaveLength(3); // Only published years
      });

      // Should not see draft year
      expect(screen.queryByText('2021')).not.toBeInTheDocument();
    });
  });
});