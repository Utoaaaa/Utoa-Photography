import { test, expect, Page } from '@playwright/test';

test.describe('Collection Detail Photo Viewer', () => {
  let testYearId: string;
  let testCollectionId: string;
  let testAssetIds: string[] = [];

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