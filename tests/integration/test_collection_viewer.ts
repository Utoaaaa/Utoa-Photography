/**
 * Integration Test: Single-Screen Collection Viewer + Existing Collection Detail Tests
 * 
 * Tests the complete user flow for single-screen collection viewing with slide navigation.
 * This test MUST FAIL until frontend components are implemented.
 */
// @ts-nocheck

import { test, expect, Page } from '@playwright/test';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Next.js router for React Testing Library tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/2024/test-collection',
}));

describe('Integration: Single-Screen Collection Viewer (React Testing Library)', () => {
  const mockCollectionData = {
    id: 'test-collection-id',
    title: 'Test Photography Collection',
    year: 2024,
    assets: [
      {
        id: 'asset-1',
        image_url: 'https://example.com/image1.jpg',
        alt: 'First test image description',
        text: 'This is the first slide with detailed text content.',
        slide_index: 0
      },
      {
        id: 'asset-2',
        image_url: 'https://example.com/image2.jpg',
        alt: 'Second test image description',
        text: 'This is the second slide.',
        slide_index: 1
      },
      {
        id: 'asset-3',
        image_url: 'https://example.com/image3.jpg',
        alt: 'Third test image description',
        text: null, // Some slides may not have text
        slide_index: 2
      },
      {
        id: 'asset-4',
        image_url: 'https://example.com/image4.jpg',
        alt: 'Fourth test image description',
        text: 'Final slide in the collection.',
        slide_index: 3
      }
    ]
  };

  beforeEach(() => {
    // Mock fetch to return collection data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCollectionData),
      })
    ) as jest.Mock;

    // Mock IntersectionObserver for lazy loading
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single-screen display and navigation', () => {
    it('should display one image per screen with corresponding text', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      const element = <CollectionPage params={Promise.resolve({ year: '2024', collection: 'test-collection' })} />;
      render(element as any);

      await waitFor(() => {
        expect(screen.getByAltText('First test image description')).toBeInTheDocument();
      });

      // Should show first slide by default
      const firstImage = screen.getByAltText('First test image description');
      expect(firstImage).toBeVisible();

      // Should show corresponding text
      const slideText = screen.getByText('This is the first slide with detailed text content.');
      expect(slideText).toBeInTheDocument();

      // Should not show other slides initially
      expect(screen.queryByAltText('Second test image description')).not.toBeVisible();
    });

    it('should support swipe navigation for touch devices', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByAltText('First test image description')).toBeInTheDocument();
      });

      const slideContainer = screen.getByTestId('slide-container');

      // Simulate swipe left (next slide)
      fireEvent.touchStart(slideContainer, { 
        touches: [{ clientX: 300, clientY: 200 }] 
      });
      fireEvent.touchMove(slideContainer, { 
        touches: [{ clientX: 100, clientY: 200 }] 
      });
      fireEvent.touchEnd(slideContainer);

      await waitFor(() => {
        expect(screen.getByAltText('Second test image description')).toBeVisible();
      });

      // First slide should no longer be visible
      expect(screen.queryByAltText('First test image description')).not.toBeVisible();
    });

    it('should support keyboard navigation (arrow keys)', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByAltText('First test image description')).toBeInTheDocument();
      });

      const slideContainer = screen.getByTestId('slide-container');
      slideContainer.focus();

      // Navigate to next slide with right arrow
      fireEvent.keyDown(slideContainer, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByAltText('Second test image description')).toBeVisible();
      });

      // Navigate back with left arrow
      fireEvent.keyDown(slideContainer, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByAltText('First test image description')).toBeVisible();
      });
    });

    it('should provide dot navigation for direct slide access', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('dot-navigation')).toBeInTheDocument();
      });

      const dotNavigation = screen.getByTestId('dot-navigation');
      const dots = screen.getAllByRole('button', { name: /slide \d+/i });

      // Should have 4 dots for 4 slides
      expect(dots).toHaveLength(4);

      // Click on third dot (index 2)
      fireEvent.click(dots[2]);

      await waitFor(() => {
        expect(screen.getByAltText('Third test image description')).toBeVisible();
      });

      // Should update active dot
      expect(dots[2]).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('ARIA and accessibility support', () => {
    it('should have proper ARIA roles and labels', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /collection viewer/i })).toBeInTheDocument();
      });

      // Main viewer should have region role
      const viewer = screen.getByRole('region', { name: /collection viewer/i });
      expect(viewer).toHaveAttribute('aria-label', expect.stringContaining('collection'));

      // Dot navigation should have proper roles
      const dotNavigation = screen.getByTestId('dot-navigation');
      expect(dotNavigation).toHaveAttribute('role', 'tablist');

      const dots = screen.getAllByRole('button', { name: /slide \d+/i });
      dots.forEach((dot, index) => {
        expect(dot).toHaveAttribute('aria-label', `Slide ${index + 1} of ${dots.length}`);
      });
    });

    it('should announce slide changes to screen readers', async () => {
      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('slide-container')).toBeInTheDocument();
      });

      const slideContainer = screen.getByTestId('slide-container');

      // Should have live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Navigate to next slide
      fireEvent.keyDown(slideContainer, { key: 'ArrowRight' });

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent(/slide 2 of 4/i);
      });
    });

    it('should respect prefers-reduced-motion for animations', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const CollectionPage = await import('@/app/(site)/[year]/[collection]/page').then(m => m.default);
      render(<CollectionPage params={{ year: '2024', collection: 'test-collection' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('slide-container')).toBeInTheDocument();
      });

      const slideContainer = screen.getByTestId('slide-container');

      // Navigate to next slide
      fireEvent.keyDown(slideContainer, { key: 'ArrowRight' });

      // Should not have transition/animation classes when reduced motion is preferred
      expect(slideContainer).not.toHaveClass(/transition|animate|motion/);
    });
  });
});

// Existing Playwright tests continue below...

  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
  });

  test('should display collection header with title and geometric pattern', async ({ page }) => {
    await page.goto('/2024/test-collection');

    // Check collection header
    const header = page.locator('[data-testid="collection-header"]');
    await expect(header).toBeVisible();
    
    const title = header.locator('[data-testid="collection-title"]');
    await expect(title).toContainText('Test Collection');
    
    const geometricPattern = header.locator('[data-testid="header-geometric"]');
    await expect(geometricPattern).toBeVisible();
  });

  test('should display photo viewer with first photo centered', async ({ page }) => {
    await page.goto('/2024/test-collection');

    // Check photo viewer
    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();
    
    const currentPhoto = photoViewer.locator('[data-testid="current-photo"]');
    await expect(currentPhoto).toBeVisible();
    
    // Should display first photo by default
    await expect(currentPhoto.locator('img')).toHaveAttribute('alt', 'Test photo 1');
  });

  test('should display dot navigation with correct number of dots', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const dotNavigation = page.locator('[data-testid="dot-navigation"]');
    await expect(dotNavigation).toBeVisible();
    
    // Should have 3 dots for 3 photos
    const dots = dotNavigation.locator('[data-testid="nav-dot"]');
    await expect(dots).toHaveCount(3);
    
    // First dot should be active
    await expect(dots.first()).toHaveClass(/active|current/);
  });

  test('should navigate between photos by clicking dots', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    const dots = page.locator('[data-testid="nav-dot"]');

    // Click second dot
    await dots.nth(1).click();
    
    // Should display second photo
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 2');
    
    // Second dot should be active
    await expect(dots.nth(1)).toHaveClass(/active|current/);
    
    // Click third dot
    await dots.nth(2).click();
    
    // Should display third photo
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 3');
  });

  test('should sync dot navigation with photo scroll position', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const photoContainer = page.locator('[data-testid="photo-container"]');
    const dots = page.locator('[data-testid="nav-dot"]');

    // Scroll to second photo area
    await photoContainer.evaluate(el => {
      el.scrollTo({ top: el.scrollHeight / 3, behavior: 'smooth' });
    });

    // Wait for intersection observer to update
    await page.waitForTimeout(500);

    // Second dot should become active
    await expect(dots.nth(1)).toHaveClass(/active|current/);
  });

  test('should display photo captions when available', async ({ page }) => {
    await page.goto('/2024/test-collection');

    // Click to navigate to photo with caption
    const dots = page.locator('[data-testid="nav-dot"]');
    await dots.nth(1).click();

    const caption = page.locator('[data-testid="photo-caption"]');
    await expect(caption).toBeVisible();
    await expect(caption).toContainText('Caption for test photo 2');
  });

  test('should display collection description in sidebar', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const sidebar = page.locator('[data-testid="collection-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    const description = sidebar.locator('[data-testid="collection-description"]');
    await expect(description).toBeVisible();
    await expect(description).toContainText('Test collection description');
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const breadcrumb = page.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    
    // Should show: Home > 2024 > Test Collection
    const breadcrumbLinks = breadcrumb.locator('a');
    await expect(breadcrumbLinks.nth(0)).toContainText('Home');
    await expect(breadcrumbLinks.nth(1)).toContainText('2024');
    
    const currentCrumb = breadcrumb.locator('span').last();
    await expect(currentCrumb).toContainText('Test Collection');
  });

  test('should navigate back to year page via breadcrumb', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const yearBreadcrumb = page.locator('[data-testid="breadcrumb"] a').nth(1);
    await yearBreadcrumb.click();

    await expect(page).toHaveURL('/2024');
    await expect(page.locator('h1')).toContainText('2024');
  });

  test('should handle responsive layout on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/2024/test-collection');

    // Header should stack vertically on mobile
    const header = page.locator('[data-testid="collection-header"]');
    await expect(header).toHaveCSS('flex-direction', 'column');

    // Photo viewer should be full width
    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();

    // Dot navigation should remain functional
    const dots = page.locator('[data-testid="nav-dot"]');
    await expect(dots).toHaveCount(3);
    await dots.nth(1).click();
    await expect(dots.nth(1)).toHaveClass(/active|current/);
  });

  test('should handle keyboard navigation for accessibility', async ({ page }) => {
    await page.goto('/2024/test-collection');

    // Tab to dot navigation
    await page.keyboard.press('Tab');
    const firstDot = page.locator('[data-testid="nav-dot"]').first();
    await expect(firstDot).toBeFocused();

    // Use arrow keys to navigate
    await page.keyboard.press('ArrowRight');
    const secondDot = page.locator('[data-testid="nav-dot"]').nth(1);
    await expect(secondDot).toBeFocused();

    // Press Enter to activate
    await page.keyboard.press('Enter');
    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 2');
  });

  test('should load images progressively and handle loading states', async ({ page }) => {
    // Slow down image loading
    await page.route('**/test-asset-*', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/2024/test-collection');

    // Should show loading placeholder
    const loadingPlaceholder = page.locator('[data-testid="image-loading"]');
    await expect(loadingPlaceholder).toBeVisible();

    // Wait for image to load
    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(currentPhoto).toBeVisible({ timeout: 5000 });
    
    // Loading placeholder should disappear
    await expect(loadingPlaceholder).not.toBeVisible();
  });

  test('should handle aspect ratio preservation', async ({ page }) => {
    await page.goto('/2024/test-collection');

    const photoContainer = page.locator('[data-testid="photo-container"]');
    const currentPhoto = page.locator('[data-testid="current-photo"] img');

    // Wait for image to load
    await expect(currentPhoto).toBeVisible();

    // Check that aspect ratio is maintained
    const containerBounds = await photoContainer.boundingBox();
    const imageBounds = await currentPhoto.boundingBox();
    
    expect(containerBounds).toBeTruthy();
    expect(imageBounds).toBeTruthy();
    
    // Image should fit within container while maintaining aspect ratio
    expect(imageBounds!.width).toBeLessThanOrEqual(containerBounds!.width);
    expect(imageBounds!.height).toBeLessThanOrEqual(containerBounds!.height);
  });

  test('should handle empty collection gracefully', async ({ page }) => {
    // Create empty collection
    const yearResponse = await page.request.post('/api/years', {
      data: { label: '2023', status: 'published' }
    });
    const year = await yearResponse.json();
    
    const collectionResponse = await page.request.post(`/api/years/${year.id}/collections`, {
      data: {
        slug: 'empty-collection',
        title: 'Empty Collection',
        status: 'published'
      }
    });

    await page.goto('/2023/empty-collection');

    // Should show empty state
    const emptyState = page.locator('[data-testid="empty-collection"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No photos in this collection yet');

    // Dot navigation should not be visible
    const dotNavigation = page.locator('[data-testid="dot-navigation"]');
    await expect(dotNavigation).not.toBeVisible();
  });

  test('should return 404 for non-existent collection', async ({ page }) => {
    const response = await page.goto('/2024/non-existent-collection');
    expect(response?.status()).toBe(404);
  });

  async function setupTestData(page: Page) {
    // Create test year
    const yearResponse = await page.request.post('/api/years', {
      data: {
        label: '2024',
        status: 'published'
      }
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    // Create test collection
    const collectionResponse = await page.request.post(`/api/years/${testYearId}/collections`, {
      data: {
        slug: 'test-collection',
        title: 'Test Collection',
        summary: 'Test collection description',
        status: 'published'
      }
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Create test assets
    const assets = [
      { id: 'test-asset-1', alt: 'Test photo 1', width: 1920, height: 1080 },
      { id: 'test-asset-2', alt: 'Test photo 2', caption: 'Caption for test photo 2', width: 1920, height: 1080 },
      { id: 'test-asset-3', alt: 'Test photo 3', width: 1920, height: 1080 }
    ];

    for (const assetData of assets) {
      const assetResponse = await page.request.post('/api/assets', {
        data: assetData
      });
      const asset = await assetResponse.json();
      testAssetIds.push(asset.id);
    }

    // Add assets to collection
    await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: {
        asset_ids: testAssetIds
      }
    });
  }
});