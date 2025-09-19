import { test, expect, Page } from '@playwright/test';

test.describe('Year Page Collection Browsing', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data via API
    await setupTestData(page);
  });

  test('should display year title and collections list', async ({ page }) => {
    await page.goto('/2024');

    // Check year title is displayed
    await expect(page.locator('h1')).toContainText('2024');

    // Check collections are displayed
    const collectionElements = page.locator('[data-testid="collection-item"]');
    await expect(collectionElements).toHaveCount(3); // Assuming 3 test collections

    // Check each collection has required elements
    const firstCollection = collectionElements.first();
    await expect(firstCollection.locator('[data-testid="collection-title"]')).toBeVisible();
    await expect(firstCollection.locator('[data-testid="collection-summary"]')).toBeVisible();
    await expect(firstCollection.locator('[data-testid="collection-cover"]')).toBeVisible();
  });

  test('should navigate to collection detail when clicking collection', async ({ page }) => {
    await page.goto('/2024');

    // Click on first collection
    const firstCollection = page.locator('[data-testid="collection-item"]').first();
    await firstCollection.click();

    // Should navigate to collection detail page
    await expect(page).toHaveURL(/\/2024\/[a-z-]+/);
    
    // Verify we're on collection detail page
    await expect(page.locator('[data-testid="collection-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-viewer"]')).toBeVisible();
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    await page.goto('/2024');

    const breadcrumb = page.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    
    // Should show: Home > 2024
    await expect(breadcrumb.locator('a').first()).toContainText('Home');
    await expect(breadcrumb.locator('span').last()).toContainText('2024');
  });

  test('should handle responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/2024');

    // Verify mobile layout
    const collectionsGrid = page.locator('[data-testid="collections-grid"]');
    await expect(collectionsGrid).toHaveCSS('grid-template-columns', /1fr/); // Single column on mobile

    // Verify collections are still clickable and readable
    const firstCollection = page.locator('[data-testid="collection-item"]').first();
    await expect(firstCollection).toBeVisible();
    await expect(firstCollection.locator('[data-testid="collection-title"]')).toBeVisible();
  });

  test('should display geometric pattern alongside collections', async ({ page }) => {
    await page.goto('/2024');

    // Check for geometric design elements
    const geometricPattern = page.locator('[data-testid="geometric-pattern"]');
    await expect(geometricPattern).toBeVisible();

    // Verify pattern doesn't interfere with content
    const collectionsArea = page.locator('[data-testid="collections-area"]');
    await expect(collectionsArea).toBeVisible();
  });

  test('should show empty state when year has no collections', async ({ page }) => {
    // Create year without collections
    const response = await page.request.post('/api/years', {
      data: {
        label: '2023',
        status: 'published'
      }
    });
    const year = await response.json();

    await page.goto('/2023');

    // Should show empty state
    const emptyState = page.locator('[data-testid="empty-collections"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No collections yet');
  });

  test('should filter collections by status (only published visible)', async ({ page }) => {
    await page.goto('/2024');

    // Only published collections should be visible
    const visibleCollections = page.locator('[data-testid="collection-item"]');
    
    // Count should match only published collections
    const allCollections = await page.request.get('/api/years/test-year-id/collections?status=all');
    const allData = await allCollections.json();
    const publishedCount = allData.filter((c: any) => c.status === 'published').length;
    
    await expect(visibleCollections).toHaveCount(publishedCount);
  });

  test('should maintain collection order based on order_index', async ({ page }) => {
    await page.goto('/2024');

    const collectionTitles = page.locator('[data-testid="collection-title"]');
    
    // Get all collection titles
    const titles = await collectionTitles.allTextContents();
    
    // Verify they appear in the correct order (should match API order)
    const apiResponse = await page.request.get('/api/years/test-year-id/collections?status=published');
    const apiCollections = await apiResponse.json();
    const expectedTitles = apiCollections.map((c: any) => c.title);
    
    expect(titles).toEqual(expectedTitles);
  });

  test('should handle keyboard navigation between collections', async ({ page }) => {
    await page.goto('/2024');

    // Focus first collection
    await page.keyboard.press('Tab');
    const firstCollection = page.locator('[data-testid="collection-item"]').first();
    await expect(firstCollection).toBeFocused();

    // Navigate to next collection
    await page.keyboard.press('Tab');
    const secondCollection = page.locator('[data-testid="collection-item"]').nth(1);
    await expect(secondCollection).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/2024\/[a-z-]+/);
  });

  test('should return 404 for non-existent year', async ({ page }) => {
    const response = await page.goto('/2099');
    expect(response?.status()).toBe(404);
  });

  test('should display loading states during navigation', async ({ page }) => {
    // Slow down network to see loading states
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 500);
    });

    const navigationPromise = page.goto('/2024');
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]');
    await expect(loadingIndicator).toBeVisible();

    await navigationPromise;
    
    // Loading should disappear when content loads
    await expect(loadingIndicator).not.toBeVisible();
    await expect(page.locator('[data-testid="collections-grid"]')).toBeVisible();
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

    // Create test collections
    const collections = [
      { slug: 'spring-collection', title: 'Spring Collection', status: 'published' },
      { slug: 'summer-vibes', title: 'Summer Vibes', status: 'published' },
      { slug: 'autumn-moods', title: 'Autumn Moods', status: 'published' }
    ];

    for (const collectionData of collections) {
      await page.request.post(`/api/years/${year.id}/collections`, {
        data: collectionData
      });
    }

    // Store year ID for other tests
    (page as any).testYearId = year.id;
  }
});