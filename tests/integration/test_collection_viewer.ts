/**
 * Integration Test: Single-Screen Collection Viewer + Existing Collection Detail Tests
 * 
 * Tests the complete user flow for single-screen collection viewing with slide navigation.
 * This test MUST FAIL until frontend components are implemented.
 */
// @ts-nocheck

import { test, expect, Page } from '@playwright/test';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const TEST_YEAR_LABEL = '2024';
const TEST_LOCATION_SLUG = 'test-location-24';
const TEST_LOCATION_NAME = 'Test Location 24';
const COLLECTION_ROUTE = `/${TEST_YEAR_LABEL}/${TEST_LOCATION_SLUG}/test-collection`;

// Mock Next.js router for React Testing Library tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => COLLECTION_ROUTE,
  useParams: () => ({
    year: TEST_YEAR_LABEL,
    location: TEST_LOCATION_SLUG,
    collection: 'test-collection',
  }),
}));

describe('Integration: Single-Screen Collection Viewer (React Testing Library)', () => {
  const mockCollectionData = {
    year: { id: 'year-2024', label: TEST_YEAR_LABEL },
    location: {
      id: 'location-2024',
      slug: TEST_LOCATION_SLUG,
      name: TEST_LOCATION_NAME,
      summary: 'Test location summary',
    },
    collection: {
      id: 'test-collection-id',
      slug: 'test-collection',
      title: 'Test Photography Collection',
      summary: 'Test collection description',
    },
    photos: [
      {
        id: 'asset-1',
        alt: 'First test image description',
        caption: 'This is the first slide with detailed text content.',
        width: 1920,
        height: 1080,
      },
      {
        id: 'asset-2',
        alt: 'Second test image description',
        caption: 'This is the second slide.',
        width: 1920,
        height: 1080,
      },
      {
        id: 'asset-3',
        alt: 'Third test image description',
        caption: null,
        width: 1920,
        height: 1080,
      },
      {
        id: 'asset-4',
        alt: 'Fourth test image description',
        caption: 'Final slide in the collection.',
        width: 1920,
        height: 1080,
      },
    ],
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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage) as any);

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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage));

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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage));

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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage));

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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage));

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
      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
    render(React.createElement(CollectionPage));

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

      const CollectionPage = await import('@/app/(site)/[year]/[location]/[collection]/page').then(m => m.default);
      render(React.createElement(CollectionPage));

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

test.describe('Integration: Single-Screen Collection Viewer (Playwright)', () => {
  let testYearId: string | null = null;
  let testLocationId: string | null = null;
  let testCollectionId: string | null = null;
  let testAssetIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    testAssetIds = [];
    await setupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    await teardownTestData(page);
  });

  test('should display collection header with title and geometric pattern', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const header = page.locator('[data-testid="collection-header"]');
    await expect(header).toBeVisible();

    const title = header.locator('[data-testid="collection-title"]');
    await expect(title).toContainText('Test Collection');

    const geometricPattern = header.locator('[data-testid="header-geometric"]');
    await expect(geometricPattern).toBeVisible();
  });

  test('should display photo viewer with first photo centered', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();

    const currentPhoto = photoViewer.locator('[data-testid="current-photo"]');
    await expect(currentPhoto).toBeVisible();

    await expect(currentPhoto.locator('img')).toHaveAttribute('alt', 'Test photo 1');
  });

  test('should display dot navigation with correct number of dots', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const dotNavigation = page.locator('[data-testid="dot-navigation"]');
    await expect(dotNavigation).toBeVisible();

    const dots = dotNavigation.locator('[data-testid="nav-dot"]');
    await expect(dots).toHaveCount(3);
    await expect(dots.first()).toHaveClass(/active|current/);
  });

  test('should navigate between photos by clicking dots', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    const dots = page.locator('[data-testid="nav-dot"]');

    await dots.nth(1).click();
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 2');
    await expect(dots.nth(1)).toHaveClass(/active|current/);

    await dots.nth(2).click();
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 3');
  });

  test('should sync dot navigation with photo scroll position', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const photoContainer = page.locator('[data-testid="photo-container"]');
    const dots = page.locator('[data-testid="nav-dot"]');

    await photoContainer.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight / 3, behavior: 'smooth' });
    });

    await page.waitForTimeout(500);
    await expect(dots.nth(1)).toHaveClass(/active|current/);
  });

  test('should display photo captions when available', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const dots = page.locator('[data-testid="nav-dot"]');
    await dots.nth(1).click();

    const caption = page.locator('[data-testid="photo-caption"]');
    await expect(caption).toBeVisible();
    await expect(caption).toContainText('Caption for test photo 2');
  });

  test('should display collection description in sidebar', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const sidebar = page.locator('[data-testid="collection-sidebar"]');
    await expect(sidebar).toBeVisible();

    const description = sidebar.locator('[data-testid="collection-description"]');
    await expect(description).toBeVisible();
    await expect(description).toContainText('Test collection description');
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const breadcrumb = page.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    const breadcrumbLinks = breadcrumb.locator('a');
    await expect(breadcrumbLinks).toHaveCount(3);
    await expect(breadcrumbLinks.nth(0)).toContainText('Home');
    await expect(breadcrumbLinks.nth(1)).toContainText(TEST_YEAR_LABEL);
    await expect(breadcrumbLinks.nth(2)).toContainText(TEST_LOCATION_NAME);

    const currentCrumb = breadcrumb.locator('span').last();
    await expect(currentCrumb).toContainText('Test Collection');
  });

  test('should navigate back to year section via breadcrumb', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const breadcrumb = page.locator('[data-testid="breadcrumb"]');
    const yearBreadcrumb = breadcrumb.locator('a').nth(1);
    await Promise.all([
      page.waitForURL(new RegExp(`#year-${TEST_YEAR_LABEL}$`)),
      yearBreadcrumb.click(),
    ]);

    await expect(page.locator(`[id="year-${TEST_YEAR_LABEL}"]`)).toBeVisible();
  });

  test('should handle responsive layout on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(COLLECTION_ROUTE);

    const header = page.locator('[data-testid="collection-header"]');
    await expect(header).toHaveCSS('flex-direction', 'column');

    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();

    const dots = page.locator('[data-testid="nav-dot"]');
    await expect(dots).toHaveCount(3);
    await dots.nth(1).click();
    await expect(dots.nth(1)).toHaveClass(/active|current/);
  });

  test('should handle keyboard navigation for accessibility', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    await page.keyboard.press('Tab');
    const firstDot = page.locator('[data-testid="nav-dot"]').first();
    await expect(firstDot).toBeFocused();

    await page.keyboard.press('ArrowRight');
    const secondDot = page.locator('[data-testid="nav-dot"]').nth(1);
    await expect(secondDot).toBeFocused();

    await page.keyboard.press('Enter');
    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(currentPhoto).toHaveAttribute('alt', 'Test photo 2');
  });

  test('should load images progressively and handle loading states', async ({ page }) => {
    await page.route('**/test-asset-*', (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto(COLLECTION_ROUTE);

    const loadingPlaceholder = page.locator('[data-testid="image-loading"]');
    await expect(loadingPlaceholder).toBeVisible();

    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(currentPhoto).toBeVisible({ timeout: 5000 });
    await expect(loadingPlaceholder).not.toBeVisible();
  });

  test('should handle aspect ratio preservation', async ({ page }) => {
    await page.goto(COLLECTION_ROUTE);

    const photoContainer = page.locator('[data-testid="photo-container"]');
    const currentPhoto = page.locator('[data-testid="current-photo"] img');

    await expect(currentPhoto).toBeVisible();

    const containerBounds = await photoContainer.boundingBox();
    const imageBounds = await currentPhoto.boundingBox();

    expect(containerBounds).toBeTruthy();
    expect(imageBounds).toBeTruthy();
    expect(imageBounds!.width).toBeLessThanOrEqual(containerBounds!.width);
    expect(imageBounds!.height).toBeLessThanOrEqual(containerBounds!.height);
  });

  test('should handle empty collection gracefully', async ({ page }) => {
    const yearResponse = await page.request.post('/api/years', {
      data: { label: '2023', status: 'published' },
    });
    const year = await yearResponse.json();

    const locationResponse = await page.request.post(`/api/admin/years/${year.id}/locations`, {
      data: {
        name: 'Empty Location',
        slug: 'empty-location',
        summary: null,
      },
    });
    const location = await locationResponse.json();

    const collectionResponse = await page.request.post(`/api/years/${year.id}/collections`, {
      data: {
        slug: 'empty-collection',
        title: 'Empty Collection',
        status: 'published',
      },
    });
    const collection = await collectionResponse.json();

    await page.request.post(`/api/admin/collections/${collection.id}/location`, {
      data: { locationId: location.id },
    });

    await page.goto(`/${encodeURIComponent(year.label)}/${location.slug}/empty-collection`);

    const emptyState = page.locator('[data-testid="empty-collection"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No photos in this collection yet');

    const dotNavigation = page.locator('[data-testid="dot-navigation"]');
    await expect(dotNavigation).not.toBeVisible();

    await page.request.delete(`/api/years/${year.id}?force=true`);
  });

  test('should return 404 for non-existent collection', async ({ page }) => {
    const response = await page.goto(`/${TEST_YEAR_LABEL}/${TEST_LOCATION_SLUG}/non-existent-collection`);
    expect(response?.status()).toBe(404);
  });

  async function setupTestData(page: Page) {
    await cleanupExistingTestYear(page);

    const yearResponse = await page.request.post('/api/years', {
      data: { label: TEST_YEAR_LABEL, status: 'published' },
    });
    const year = await yearResponse.json();
    testYearId = year.id;

    const locationResponse = await page.request.post(`/api/admin/years/${testYearId}/locations`, {
      data: {
        name: TEST_LOCATION_NAME,
        slug: TEST_LOCATION_SLUG,
        summary: 'Test location summary',
      },
    });
    const location = await locationResponse.json();
    testLocationId = location.id;

    const collectionResponse = await page.request.post(`/api/years/${testYearId}/collections`, {
      data: {
        slug: 'test-collection',
        title: 'Test Collection',
        summary: 'Test collection description',
        status: 'published',
      },
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    const assets = [
      { id: 'test-asset-1', alt: 'Test photo 1', width: 1920, height: 1080 },
      { id: 'test-asset-2', alt: 'Test photo 2', caption: 'Caption for test photo 2', width: 1920, height: 1080 },
      { id: 'test-asset-3', alt: 'Test photo 3', width: 1920, height: 1080 },
    ];

    for (const assetData of assets) {
      const assetResponse = await page.request.post('/api/assets', { data: assetData });
      const asset = await assetResponse.json();
      testAssetIds.push(asset.id);
    }

    await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: { asset_ids: testAssetIds },
    });

    await page.request.post(`/api/admin/collections/${testCollectionId}/location`, {
      data: { locationId: testLocationId },
    });
  }

  async function teardownTestData(page: Page) {
    if (testYearId) {
      await page.request.delete(`/api/years/${testYearId}?force=true`);
    } else {
      await cleanupExistingTestYear(page);
    }

    for (const assetId of testAssetIds) {
      await page.request.delete(`/api/assets/${assetId}`);
    }

    testYearId = null;
    testLocationId = null;
    testCollectionId = null;
    testAssetIds = [];
  }

  async function cleanupExistingTestYear(page: Page) {
    const response = await page.request.get('/api/years?status=all&order=asc');
    if (!response.ok()) return;

    const years = await response.json();
    const deletions = years
      .filter((year: { id: string; label: string }) => year.label === TEST_YEAR_LABEL)
      .map((year: { id: string }) => page.request.delete(`/api/years/${year.id}?force=true`));

    if (deletions.length > 0) {
      await Promise.all(deletions);
    }
  }
});