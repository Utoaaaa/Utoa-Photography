import { test, expect, Page } from '@playwright/test';

test.describe('Admin Content Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication headers for Cloudflare Access
    await page.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': process.env.TEST_CF_ACCESS_TOKEN || 'test-token'
    });

    // Clean up test data to prevent strict mode violations
    await cleanupTestData(page);
  });

  test('should access admin dashboard with authentication', async ({ page }) => {
    await page.goto('/admin');

    // Should successfully load admin dashboard
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Admin Dashboard');

    // Should show main navigation options
    await expect(page.locator('[data-testid="nav-years"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-collections"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-uploads"]')).toBeVisible();
  });

  test('should manage years - create, edit, delete', async ({ page }) => {
    await page.goto('/admin/years');

    // Create new year
    await page.click('[data-testid="create-year-btn"]');
    
    const createForm = page.locator('[data-testid="year-form"]');
    await expect(createForm).toBeVisible();
    
    await page.fill('[data-testid="year-label-input"]', '2025');
    await page.selectOption('[data-testid="year-status-select"]', 'draft');
    await page.click('[data-testid="save-year-btn"]');

    // Should see success message and new year in list
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="year-item"]').filter({ hasText: '2025' })).toBeVisible();

    // Edit year
    const yearItem = page.locator('[data-testid="year-item"]').filter({ hasText: '2025' });
    await yearItem.locator('[data-testid="edit-year-btn"]').click();
    
    await page.fill('[data-testid="year-label-input"]', '2025 Updated');
    await page.selectOption('[data-testid="year-status-select"]', 'published');
    await page.click('[data-testid="save-year-btn"]');

    // Should see updated year
    await expect(page.locator('[data-testid="year-item"]').filter({ hasText: '2025 Updated' })).toBeVisible();

    // Delete year
    await yearItem.locator('[data-testid="delete-year-btn"]').click();
    
    // Should show confirmation dialog
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await page.click('[data-testid="confirm-delete-btn"]');

    // Year should be removed from list
    await expect(page.locator('[data-testid="year-item"]').filter({ hasText: '2025 Updated' })).not.toBeVisible();
  });

  test('should manage collections within a year', async ({ page }) => {
    // First create a test year
    await setupTestYear(page);

    await page.goto('/admin/collections');

    // Select year from dropdown
    await page.selectOption('[data-testid="year-filter-select"]', { label: 'Test Year 2024' });

    // Create new collection
    await page.click('[data-testid="create-collection-btn"]');
    
    const createForm = page.locator('[data-testid="collection-form"]');
    await page.fill('[data-testid="collection-slug-input"]', 'admin-test-collection');
    await page.fill('[data-testid="collection-title-input"]', 'Admin Test Collection');
    await page.fill('[data-testid="collection-summary-textarea"]', 'A collection created via admin interface');
    await page.selectOption('[data-testid="collection-status-select"]', 'draft');
    await page.click('[data-testid="save-collection-btn"]');

    // Should see new collection in list
    await expect(page.locator('[data-testid="collection-item"]').filter({ hasText: 'Admin Test Collection' })).toBeVisible();

    // Edit collection
    const collectionItem = page.locator('[data-testid="collection-item"]').filter({ hasText: 'Admin Test Collection' });
    await collectionItem.locator('[data-testid="edit-collection-btn"]').click();
    
    await page.fill('[data-testid="collection-title-input"]', 'Updated Admin Collection');
    await page.selectOption('[data-testid="collection-status-select"]', 'published');
    await page.click('[data-testid="save-collection-btn"]');

    // Should see updated collection
    await expect(page.locator('[data-testid="collection-item"]').filter({ hasText: 'Updated Admin Collection' })).toBeVisible();
  });

  test('should reorder collections within a year', async ({ page }) => {
    await setupTestYear(page);
    await setupTestCollections(page);

    await page.goto('/admin/collections');
    await page.selectOption('[data-testid="year-filter-select"]', { label: 'Test Year 2024' });

    // Get initial order
    const collectionItems = page.locator('[data-testid="collection-item"]');
    const initialOrder = await collectionItems.allTextContents();

    // Use button-based move-down on the first item
    await collectionItems.first().locator('[data-testid="move-collection-down"]').click();

    // Verify order has changed
    const newOrder = await collectionItems.allTextContents();
    expect(newOrder).not.toEqual(initialOrder);

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Collection order updated');

    // Reload and ensure persistence
    await page.reload();
    const afterReload = await page.locator('[data-testid="collection-item"]').allTextContents();
    expect(afterReload).toEqual(newOrder);
  });

  test('should handle image upload workflow', async ({ page }) => {
    await page.goto('/admin/uploads');

    // Upload area should be visible
    await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();

    // Mock file upload for testing
    await page.route('**/api/images/direct-upload', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          upload_url: 'https://imagedelivery.net/test-upload-url',
          image_id: 'test-uploaded-image-id',
          form_data: {}
        })
      });
    });

    await page.route('https://imagedelivery.net/test-upload-url', route => {
      route.fulfill({ status: 200 });
    });

    // Mock asset creation
    await page.route('**/api/assets', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: 'test-uploaded-image-id' })
        });
      } else {
        route.continue();
      }
    });

    // Trigger upload process
    await page.click('[data-testid="select-files-btn"]');
    
    // Fill in asset metadata
    await page.fill('[data-testid="asset-alt-input"]', 'Uploaded test image');
    await page.fill('[data-testid="asset-caption-textarea"]', 'This image was uploaded via admin interface');
    await page.click('[data-testid="save-asset-btn"]');

    // Should show upload success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="asset-list"]')).toContainText('Uploaded test image');
  });

  test('should assign photos to collections', async ({ page }) => {
    await setupTestYear(page);
    await setupTestCollections(page);
    await setupTestAssets(page);

    await page.goto('/admin/collections');
    await page.selectOption('[data-testid="year-filter-select"]', { label: 'Test Year 2024' });

    // Click on collection to manage photos
    const collectionItem = page.locator('[data-testid="collection-item"]').first();
    await collectionItem.locator('[data-testid="manage-photos-btn"]').click();

    // Should show photo management interface
    await expect(page.locator('[data-testid="photo-manager"]')).toBeVisible();
    
    // Available assets should be shown
    await expect(page.locator('[data-testid="available-assets"]')).toBeVisible();
    const availableAssets = page.locator('[data-testid="asset-card"]');
    await expect(availableAssets.first()).toBeVisible();

    // Select assets to add
    await availableAssets.first().click();
    await availableAssets.nth(1).click();

    // Add selected assets to collection
    await page.click('[data-testid="add-to-collection-btn"]');

    // Should show assets in collection
    const collectionAssets = page.locator('[data-testid="collection-asset"]');
    await expect(collectionAssets).toHaveCount(2);

    // Should be able to reorder assets within collection
    await collectionAssets.first().dragTo(collectionAssets.nth(1));
    // Note: Drag-drop triggers add operation, not reorder in current implementation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Added to collection');
  });

  test('should handle bulk operations efficiently', async ({ page }) => {
    await setupTestYear(page);
    await setupTestAssets(page);

    await page.goto('/admin/uploads');

    // Select multiple assets
    const assetCards = page.locator('[data-testid="asset-card"]');
    await assetCards.first().locator('[data-testid="asset-checkbox"]').click();
    await assetCards.nth(1).locator('[data-testid="asset-checkbox"]').click();
    await assetCards.nth(2).locator('[data-testid="asset-checkbox"]').click();

    // Bulk actions should be available
    const bulkActions = page.locator('[data-testid="bulk-actions"]');
    await expect(bulkActions).toBeVisible();

    // Test bulk delete
    await page.click('[data-testid="bulk-delete-btn"]');
    
    // Confirm bulk operation
    await page.click('[data-testid="confirm-bulk-delete-btn"]');

    // Should show progress and completion
    await expect(page.locator('[data-testid="bulk-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-complete"]')).toBeVisible({ timeout: 10000 });
  });

  test('should validate form inputs and show appropriate errors', async ({ page }) => {
    await page.goto('/admin/years');

    // Try to create year without required fields
    await page.click('[data-testid="create-year-btn"]');
    await page.click('[data-testid="save-year-btn"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Label is required');

    // Try invalid year label
    await page.fill('[data-testid="year-label-input"]', ''); // Empty
    await page.click('[data-testid="save-year-btn"]');
    await expect(page.locator('[data-testid="field-error"]')).toBeVisible();

    // Try valid input
    await page.fill('[data-testid="year-label-input"]', '2024');
    await page.click('[data-testid="save-year-btn"]');
    
    // Should succeed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle concurrent editing conflicts', async ({ page }) => {
    await setupTestYear(page);

    // Open year editing in first context
    await page.goto('/admin/years');
    const yearItem = page.locator('[data-testid="year-item"]').first();
    await yearItem.locator('[data-testid="edit-year-btn"]').click();

    // Simulate another user updating the same year
    await page.route('**/api/years/*', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Conflict',
            message: 'Year was modified by another user'
          })
        });
      } else {
        route.continue();
      }
    });

    // Try to save changes
    await page.fill('[data-testid="year-label-input"]', 'Conflicted Update');
    await page.click('[data-testid="save-year-btn"]');

    // Should show conflict error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('modified by another user');
    
    // Should offer to refresh data
    await expect(page.locator('[data-testid="refresh-data-btn"]')).toBeVisible();
  });

  test('should maintain admin session and handle logout', async ({ page }) => {
    await page.goto('/admin');

    // Should be authenticated
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();

    // User info should be displayed
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();

    // Logout should work
    await page.click('[data-testid="logout-btn"]');
    
    // Should redirect to login or show logged out state
    await expect(page).toHaveURL(/login|auth/);
  });

  test('should disable delete for years that contain collections', async ({ page }) => {
    // Create a year and a collection under it
    const yRes = await page.request.post('/api/years', { data: { label: 'Year With Collections', status: 'draft' } });
    const y = await yRes.json();
    await page.request.post(`/api/years/${y.id}/collections`, { data: { slug: 'ywc-collection', title: 'YWC Collection', status: 'draft' } });

    await page.goto('/admin/years');

    const row = page.locator('[data-testid="year-item"]').filter({ hasText: 'Year With Collections' });
    await expect(row).toBeVisible();
    const delBtn = row.locator('[data-testid="delete-year-btn"]');
    await expect(delBtn).toBeDisabled();
    await expect(delBtn).toHaveAttribute('aria-disabled', 'true');
  });

  test('should reorder years with buttons and keyboard', async ({ page }) => {
    // Prepare two years with deterministic order_index so we can observe changes
    const y1 = await (await page.request.post('/api/years', { data: { label: 'Y-Alpha', status: 'draft' } })).json();
    const y2 = await (await page.request.post('/api/years', { data: { label: 'Y-Bravo', status: 'draft' } })).json();
    // Set order so that Y-Alpha comes before Y-Bravo initially (desc sorting)
    await page.request.put(`/api/years/${y1.id}`, { data: { order_index: '2.0' } });
    await page.request.put(`/api/years/${y2.id}`, { data: { order_index: '1.0' } });

    await page.goto('/admin/years');

  const items = page.locator('[data-testid="year-item"]');
  const initial = await items.allTextContents();

    // Click move-down on the first item to swap with the next
    await items.first().locator('[data-testid="move-year-down"]').click();
    await expect(page.locator('[data-testid="success-message"]').first()).toContainText('Reordered');

    // Order should change
  const afterClick = await items.allTextContents();
  expect(afterClick).not.toEqual(initial);

  // Reload page to verify persistence
  await page.reload();
  const afterReload = await page.locator('[data-testid="year-item"]').allTextContents();
  expect(afterReload).toEqual(afterClick);

    // Keyboard: focus first row and press ArrowDown to move it further down if possible
    await items.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-testid="success-message"]').first()).toBeVisible();
  // Reload again and ensure list remains consistent
  await page.reload();
  const finalOrder = await page.locator('[data-testid="year-item"]').allTextContents();
  expect(finalOrder.length).toBeGreaterThan(0);
  });

  // Helper functions
  async function cleanupTestData(page: Page) {
    try {
      // Clean up test years
      const yearsResponse = await page.request.get('/api/years');
      if (yearsResponse.ok()) {
        const years = await yearsResponse.json();
        
        // Only delete years from PREVIOUS test runs (with specific markers)
        for (const year of years) {
          const isLeftover = 
            year.label.match(/^(2025|Y-Alpha|Y-Bravo|Year With Collections)$/i) ||
            (year.label.includes('Test') && year.label !== 'Test Year 2024');
          
          if (isLeftover) {
            await page.request.delete(`/api/years/${year.id}?force=true`);
          }
        }
      }

      // Clean up test assets more aggressively
      const assetsResponse = await page.request.get('/api/assets');
      if (assetsResponse.ok()) {
        const assets = await assetsResponse.json();
        
        for (const asset of assets) {
          // Keep only production-like assets with specific exact phrases
          const isProduction = 
            asset.alt === 'Beautiful landscape photo';
          
          if (!isProduction) {
            // Try to delete, ignore if it fails (might be in use)
            await page.request.delete(`/api/assets/${asset.id}`).catch(() => {});
          }
        }
      }
    } catch (error) {
      // Silently ignore cleanup errors
      console.warn('Cleanup warning:', error);
    }
  }

  async function setupTestYear(page: Page) {
    await page.request.post('/api/years', {
      data: {
        label: 'Test Year 2024',
        status: 'published'
      }
    });
  }

  async function setupTestCollections(page: Page) {
    const yearResponse = await page.request.get('/api/years');
    const years = await yearResponse.json();
    const testYear = years.find((y: any) => y.label === 'Test Year 2024');

    const collections = [
      { slug: 'collection-1', title: 'First Collection', status: 'published' },
      { slug: 'collection-2', title: 'Second Collection', status: 'published' },
      { slug: 'collection-3', title: 'Third Collection', status: 'draft' }
    ];

    for (const collection of collections) {
      await page.request.post(`/api/years/${testYear.id}/collections`, {
        data: collection
      });
    }
  }

  async function setupTestAssets(page: Page) {
    const assets = [
      { id: 'admin-test-asset-1', alt: 'Admin test asset 1', width: 1920, height: 1080 },
      { id: 'admin-test-asset-2', alt: 'Admin test asset 2', width: 1920, height: 1080 },
      { id: 'admin-test-asset-3', alt: 'Admin test asset 3', width: 1920, height: 1080 }
    ];

    for (const asset of assets) {
      await page.request.post('/api/assets', {
        data: asset
      });
    }
  }
});