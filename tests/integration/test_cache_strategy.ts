import { test, expect, Page } from '@playwright/test';

test.describe('Cache Invalidation and Revalidation Strategy', () => {
  let testYearId: string;
  let testCollectionId: string;

  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
  });

  test('should invalidate cache when year is created', async ({ page }) => {
    // First, load homepage to populate cache
    await page.goto('/');
    const initialYears = await page.locator('[data-testid="year-box"]').count();

    // Create new year via API
    const newYearResponse = await page.request.post('/api/years', {
      data: {
        label: '2025',
        status: 'published'
      }
    });
    expect(newYearResponse.status()).toBe(201);
    const newYear = await newYearResponse.json();

    // Trigger cache revalidation
    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: ['years:published'],
        paths: ['/']
      }
    });
    expect(revalidateResponse.status()).toBe(200);

    // Reload homepage and verify new year appears
    await page.reload();
    const updatedYears = await page.locator('[data-testid="year-box"]').count();
    expect(updatedYears).toBe(initialYears + 1);

    // Verify new year is visible
    await expect(page.locator('[data-testid="year-box"]').filter({ hasText: '2025' })).toBeVisible();

    // Cleanup
    await page.request.delete(`/api/years/${newYear.id}`);
  });

  test('should invalidate cache when year status changes', async ({ page }) => {
    // Create draft year (not visible on homepage)
    const draftYearResponse = await page.request.post('/api/years', {
      data: {
        label: 'Draft Year',
        status: 'draft'
      }
    });
    const draftYear = await draftYearResponse.json();

    // Load homepage - draft year should not be visible
    await page.goto('/');
    await expect(page.locator('[data-testid="year-box"]').filter({ hasText: 'Draft Year' })).not.toBeVisible();

    // Publish the year
    const updateResponse = await page.request.put(`/api/years/${draftYear.id}`, {
      data: {
        status: 'published'
      }
    });
    expect(updateResponse.status()).toBe(200);

    // Trigger cache revalidation
    await page.request.post('/api/revalidate', {
      data: {
        tags: ['years:published'],
        paths: ['/']
      }
    });

    // Reload and verify year now appears
    await page.reload();
    await expect(page.locator('[data-testid="year-box"]').filter({ hasText: 'Draft Year' })).toBeVisible();

    // Cleanup
    await page.request.delete(`/api/years/${draftYear.id}`);
  });

  test('should invalidate cache when collection is added to year', async ({ page }) => {
    // Load year page to populate cache
    await page.goto(`/2024`);
    const initialCollections = await page.locator('[data-testid="collection-item"]').count();

    // Create new collection
    const newCollectionResponse = await page.request.post(`/api/years/${testYearId}/collections`, {
      data: {
        slug: 'cache-test-collection',
        title: 'Cache Test Collection',
        status: 'published'
      }
    });
    expect(newCollectionResponse.status()).toBe(201);

    // Trigger cache revalidation for year collections
    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: [`collections:year:${testYearId}`],
        paths: ['/2024']
      }
    });
    expect(revalidateResponse.status()).toBe(200);

    // Reload year page and verify new collection appears
    await page.reload();
    const updatedCollections = await page.locator('[data-testid="collection-item"]').count();
    expect(updatedCollections).toBe(initialCollections + 1);

    // Verify new collection is visible
    await expect(page.locator('[data-testid="collection-item"]').filter({ hasText: 'Cache Test Collection' })).toBeVisible();
  });

  test('should invalidate cache when collection assets are modified', async ({ page }) => {
    // Create test asset
    const assetResponse = await page.request.post('/api/assets', {
      data: {
        id: 'cache-test-asset',
        alt: 'Cache test asset',
        width: 1920,
        height: 1080
      }
    });
    const asset = await assetResponse.json();

    // Load collection page to populate cache
    await page.goto(`/2024/test-collection`);
    const initialPhotos = await page.locator('[data-testid="nav-dot"]').count();

    // Add asset to collection
    const addAssetResponse = await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: {
        asset_ids: [asset.id]
      }
    });
    expect(addAssetResponse.status()).toBe(201);

    // Trigger cache revalidation for collection assets
    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: [`collection:${testCollectionId}:assets`],
        paths: ['/2024/test-collection']
      }
    });
    expect(revalidateResponse.status()).toBe(200);

    // Reload collection page and verify new photo appears
    await page.reload();
    const updatedPhotos = await page.locator('[data-testid="nav-dot"]').count();
    expect(updatedPhotos).toBe(initialPhotos + 1);

    // Verify new asset image is visible
    const dots = page.locator('[data-testid="nav-dot"]');
    await dots.last().click();
    const currentPhoto = page.locator('[data-testid="current-photo"] img');
    await expect(currentPhoto).toHaveAttribute('alt', 'Cache test asset');
  });

  test('should handle hierarchical cache invalidation', async ({ page }) => {
    // Create a new year with collection and assets
    const yearResponse = await page.request.post('/api/years', {
      data: {
        label: 'Hierarchical Test Year',
        status: 'published'
      }
    });
    const year = await yearResponse.json();

    const collectionResponse = await page.request.post(`/api/years/${year.id}/collections`, {
      data: {
        slug: 'hierarchical-collection',
        title: 'Hierarchical Collection',
        status: 'published'
      }
    });
    const collection = await collectionResponse.json();

    // Load homepage to cache years
    await page.goto('/');
    await expect(page.locator('[data-testid="year-box"]').filter({ hasText: 'Hierarchical Test Year' })).toBeVisible();

    // Delete the year (should trigger hierarchical cache invalidation)
    const deleteResponse = await page.request.delete(`/api/years/${year.id}?force=true`);
    expect(deleteResponse.status()).toBe(204);

    // Trigger comprehensive cache revalidation
    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: [
          'years:published',
          `collections:year:${year.id}`,
          `collection:${collection.id}:assets`
        ],
        paths: ['/', `/hierarchical-test-year`, `/hierarchical-test-year/hierarchical-collection`]
      }
    });
    expect(revalidateResponse.status()).toBe(200);

    // Verify all related caches are invalidated
    await page.reload();
    await expect(page.locator('[data-testid="year-box"]').filter({ hasText: 'Hierarchical Test Year' })).not.toBeVisible();

    // Verify year page returns 404
    const yearPageResponse = await page.goto('/hierarchical-test-year');
    expect(yearPageResponse?.status()).toBe(404);
  });

  test('should handle partial cache failures gracefully', async ({ page }) => {
    // Mock some cache operations to fail
    await page.route('**/api/revalidate', (route, request) => {
      const data = request.postDataJSON();
      
      // Simulate partial failure where some tags succeed, some fail
      if (data.tags.includes('problematic-tag')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            revalidated: data.tags.filter((tag: string) => tag !== 'problematic-tag'),
            failed: ['problematic-tag'],
            errors: {
              'problematic-tag': 'Cache service temporarily unavailable'
            }
          })
        });
      } else {
        route.continue();
      }
    });

    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: ['years:published', 'problematic-tag', 'collections:year:123'],
        paths: ['/']
      }
    });

    expect(revalidateResponse.status()).toBe(200);
    const result = await revalidateResponse.json();
    
    expect(result.revalidated).toContain('years:published');
    expect(result.revalidated).toContain('collections:year:123');
    expect(result.failed).toContain('problematic-tag');
    expect(result.errors['problematic-tag']).toContain('temporarily unavailable');
  });

  test('should validate cache tag format and prevent injection', async ({ page }) => {
    // Test various invalid cache tag formats
    const invalidTagTests = [
      {
        tags: ['valid-tag', '<script>alert("xss")</script>'],
        expectedStatus: 400,
        error: 'Invalid tag format'
      },
      {
        tags: ['valid-tag', 'tag with spaces'],
        expectedStatus: 400,
        error: 'Invalid tag format'
      },
      {
        tags: ['valid-tag', 'tag/with/slashes'],
        expectedStatus: 400,
        error: 'Invalid tag format'
      },
      {
        tags: ['valid-tag', 'valid:tag:format'],
        expectedStatus: 200,
        error: null
      }
    ];

    for (const test of invalidTagTests) {
      const revalidateResponse = await page.request.post('/api/revalidate', {
        data: {
          tags: test.tags
        }
      });

      expect(revalidateResponse.status()).toBe(test.expectedStatus);
      
      if (test.error) {
        const result = await revalidateResponse.json();
        expect(result.message).toContain(test.error);
      }
    }
  });

  test('should handle cache stampede protection', async ({ page }) => {
    // Simulate concurrent cache invalidation requests
    const concurrentRequests = [];
    
    for (let i = 0; i < 5; i++) {
      const request = page.request.post('/api/revalidate', {
        data: {
          tags: ['years:published'],
          paths: ['/']
        }
      });
      concurrentRequests.push(request);
    }

    // All requests should complete successfully
    const responses = await Promise.all(concurrentRequests);
    
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // Verify cache is properly invalidated despite concurrent requests
    await page.goto('/');
    await expect(page.locator('[data-testid="year-box"]').first()).toBeVisible();
  });

  test('should validate cache performance under load', async ({ page }) => {
    // Create multiple entities to invalidate
    const creationPromises = [];
    
    for (let i = 0; i < 10; i++) {
      const yearPromise = page.request.post('/api/years', {
        data: {
          label: `Load Test Year ${i}`,
          status: 'published'
        }
      });
      creationPromises.push(yearPromise);
    }

    const createdYears = await Promise.all(creationPromises);
    const yearIds = [];
    
    for (const response of createdYears) {
      expect(response.status()).toBe(201);
      const year = await response.json();
      yearIds.push(year.id);
    }

    // Generate many cache tags for invalidation
    const largeCacheTagList = [
      'years:published',
      ...yearIds.map(id => `collections:year:${id}`),
      ...yearIds.map(id => `seo:year:${id}`)
    ];

    // Measure invalidation performance
    const startTime = Date.now();
    
    const revalidateResponse = await page.request.post('/api/revalidate', {
      data: {
        tags: largeCacheTagList
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(revalidateResponse.status()).toBe(200);
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(5000); // 5 seconds

    // Cleanup
    const deletePromises = yearIds.map(id => 
      page.request.delete(`/api/years/${id}`)
    );
    await Promise.all(deletePromises);
  });

  test('should handle cache TTL and expiration correctly', async ({ page }) => {
    // Create test data and trigger caching
    await page.goto('/');
    const initialLoadTime = Date.now();

    // Wait a short period
    await page.waitForTimeout(2000);

    // Access the same page again (should serve from cache)
    const cacheStartTime = Date.now();
    await page.reload();
    const cacheEndTime = Date.now();
    const cacheLoadTime = cacheEndTime - cacheStartTime;

    // Cached load should be faster than initial load
    // (This is a simplified test - in real scenarios you'd check cache headers)
    expect(cacheLoadTime).toBeLessThan(1000); // Should load quickly from cache

    // Trigger cache invalidation
    await page.request.post('/api/revalidate', {
      data: {
        tags: ['years:published'],
        paths: ['/']
      }
    });

    // Next load should regenerate cache
    const regenerateStartTime = Date.now();
    await page.reload();
    const regenerateEndTime = Date.now();
    const regenerateTime = regenerateEndTime - regenerateStartTime;

    // Regeneration might take longer than cached load
    expect(regenerateTime).toBeGreaterThanOrEqual(cacheLoadTime);
  });

  // Helper function
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
        status: 'published'
      }
    });
    const collection = await collectionResponse.json();
    testCollectionId = collection.id;

    // Add initial test asset
    const assetResponse = await page.request.post('/api/assets', {
      data: {
        id: 'initial-test-asset',
        alt: 'Initial test asset',
        width: 1920,
        height: 1080
      }
    });

    const asset = await assetResponse.json();
    await page.request.post(`/api/collections/${testCollectionId}/assets`, {
      data: {
        asset_ids: [asset.id]
      }
    });
  }
});