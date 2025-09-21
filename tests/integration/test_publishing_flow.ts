/**
 * Integration Test: Publishing Flow + Admin CMS Interface
 * 
 * Tests the complete publishing workflow including validation, preview, and cache invalidation.
 * This test MUST FAIL until the publishing features are implemented.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Publishing Flow Integration Tests', () => {
  let testCollectionId: string | undefined;
  let adminPage: Page;

  test.beforeEach(async ({ page, context }) => {
    adminPage = page;
    
    // Setup test collection with required data
    await setupPublishingTestData(page);
    
    // Navigate to admin publishing interface
    await page.goto('/admin/publishing');
    
    // Ensure admin authentication (mock or real)
    await page.waitForSelector('[data-testid="publishing-dashboard"]');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    if (testCollectionId) {
      await cleanupTestCollection(page, testCollectionId);
    }
  });

  test.describe('Publishing checklist validation', () => {
    test('should disable publish button when SEO requirements missing', async ({ page }) => {
      // Create collection without SEO data
      const collectionId = await createTestCollection(page, {
        title: 'Collection without SEO',
        hasSEO: false,
        hasValidAssets: true
      });

      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Check checklist status
      const checklistStatus = page.locator('[data-testid="checklist-status"]');
      await expect(checklistStatus).toContainText('Pending');
      
      // Verify specific missing requirements
      const missingRequirements = page.locator('[data-testid="missing-requirements"]');
      await expect(missingRequirements).toContainText('SEO title required');
      await expect(missingRequirements).toContainText('SEO description required');
      
      // Publish button should be disabled
      const publishButton = page.locator('[data-testid="publish-button"]');
      await expect(publishButton).toBeDisabled();
      await expect(publishButton).toHaveAttribute('aria-disabled', 'true');
    });

    test('should disable publish button when alt text missing from images', async ({ page }) => {
      // Create collection with images missing alt text
      const collectionId = await createTestCollection(page, {
        title: 'Collection with missing alt text',
        hasSEO: true,
        hasValidAssets: false,
        assetIssues: ['missing_alt']
      });

      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Check checklist status
      const checklistStatus = page.locator('[data-testid="checklist-status"]');
      await expect(checklistStatus).toContainText('Pending');
      
      // Verify missing alt text requirements
      const missingRequirements = page.locator('[data-testid="missing-requirements"]');
      await expect(missingRequirements).toContainText('Alt text required for all images');
      
      // Show which specific images need alt text
      const imageList = page.locator('[data-testid="invalid-images"]');
      await expect(imageList).toBeVisible();
      
      // Publish button should be disabled
      const publishButton = page.locator('[data-testid="publish-button"]');
      await expect(publishButton).toBeDisabled();
    });

    test('should enable publish button when all requirements met', async ({ page }) => {
      // Create collection with all requirements satisfied
      const collectionId = await createTestCollection(page, {
        title: 'Valid Collection Ready to Publish',
        hasSEO: true,
        hasValidAssets: true
      });

      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Check checklist status
      const checklistStatus = page.locator('[data-testid="checklist-status"]');
      await expect(checklistStatus).toContainText('Ready');
      
      // No missing requirements should be shown
      const missingRequirements = page.locator('[data-testid="missing-requirements"]');
      await expect(missingRequirements).not.toBeVisible();
      
      // Publish button should be enabled
      const publishButton = page.locator('[data-testid="publish-button"]');
      await expect(publishButton).toBeEnabled();
      await expect(publishButton).not.toHaveAttribute('aria-disabled');
    });
  });

  test.describe('Publishing workflow execution', () => {
    test('should successfully publish collection and trigger cache invalidation', async ({ page }) => {
      // Create valid collection
      const collectionId = await createTestCollection(page, {
        title: 'Test Collection for Publishing',
        hasSEO: true,
        hasValidAssets: true
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Fill publish note
      const publishNote = page.locator('[data-testid="publish-note"]');
      await publishNote.fill('Initial publication with complete content');
      
      // Click publish button
      const publishButton = page.locator('[data-testid="publish-button"]');
      await publishButton.click();
      
      // Should show publishing progress
      const publishingSpinner = page.locator('[data-testid="publishing-spinner"]');
      await expect(publishingSpinner).toBeVisible();
      
      // Wait for success message
      const successMessage = page.locator('[data-testid="publish-success"]');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText('Successfully published');
      
      // Verify collection status updated
      const collectionStatus = page.locator('[data-testid="collection-status"]');
      await expect(collectionStatus).toContainText('Published');
      
      // Verify version incremented
      const versionInfo = page.locator('[data-testid="version-info"]');
      await expect(versionInfo).toContainText('Version 1');
      
      // Verify cache invalidation triggered
      const cacheInvalidation = page.locator('[data-testid="cache-invalidation"]');
      await expect(cacheInvalidation).toContainText('Cache cleared for: home, year, collection');
    });

    test('should show version history after multiple publishes', async ({ page }) => {
      // Create and publish collection multiple times
      const collectionId = await createTestCollection(page, {
        title: 'Collection for Version Testing',
        hasSEO: true,
        hasValidAssets: true
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // First publish
      await publishCollection(page, 'Initial publication');
      
      // Second publish
      await publishCollection(page, 'Updated with new content');
      
      // Third publish
      await publishCollection(page, 'Final version with corrections');
      
      // Check version history
      const versionHistory = page.locator('[data-testid="version-history"]');
      await expect(versionHistory).toBeVisible();
      
      const versionEntries = versionHistory.locator('[data-testid="version-entry"]');
      await expect(versionEntries).toHaveCount(3);
      
      // Verify version order (newest first)
      const firstEntry = versionEntries.nth(0);
      await expect(firstEntry).toContainText('Version 3');
      await expect(firstEntry).toContainText('Final version with corrections');
      
      const secondEntry = versionEntries.nth(1);
      await expect(secondEntry).toContainText('Version 2');
      await expect(secondEntry).toContainText('Updated with new content');
      
      const thirdEntry = versionEntries.nth(2);
      await expect(thirdEntry).toContainText('Version 1');
      await expect(thirdEntry).toContainText('Initial publication');
    });

    test('should support unpublishing with note', async ({ page }) => {
      // Create and publish collection
      const collectionId = await createTestCollection(page, {
        title: 'Collection for Unpublish Testing',
        hasSEO: true,
        hasValidAssets: true
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      await publishCollection(page, 'Initial publication');
      
      // Unpublish collection
      const unpublishButton = page.locator('[data-testid="unpublish-button"]');
      await expect(unpublishButton).toBeVisible();
      await unpublishButton.click();
      
      // Fill unpublish note
      const unpublishNote = page.locator('[data-testid="unpublish-note"]');
      await unpublishNote.fill('Unpublishing for content review');
      
      // Confirm unpublish
      const confirmUnpublishButton = page.locator('[data-testid="confirm-unpublish"]');
      await confirmUnpublishButton.click();
      
      // Verify unpublish success
      const successMessage = page.locator('[data-testid="unpublish-success"]');
      await expect(successMessage).toBeVisible();
      
      // Verify collection status updated
      const collectionStatus = page.locator('[data-testid="collection-status"]');
      await expect(collectionStatus).toContainText('Draft');
      
      // Version should remain the same (no increment)
      const versionInfo = page.locator('[data-testid="version-info"]');
      await expect(versionInfo).toContainText('Version 1');
      
      // Verify cache invalidation triggered
      const cacheInvalidation = page.locator('[data-testid="cache-invalidation"]');
      await expect(cacheInvalidation).toContainText('Cache cleared for: home, year, collection');
    });
  });

  test.describe('Preview functionality', () => {
    test('should provide collection preview in single-screen viewer', async ({ page }) => {
      const collectionId = await createTestCollection(page, {
        title: 'Collection for Preview Testing',
        hasSEO: true,
        hasValidAssets: true,
        assetCount: 4
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Open preview
      const previewButton = page.locator('[data-testid="preview-button"]');
      await previewButton.click();
      
      // Should open preview modal or tab
      const previewContainer = page.locator('[data-testid="collection-preview"]');
      await expect(previewContainer).toBeVisible();
      
      // Should show single-screen viewer
      const slideContainer = page.locator('[data-testid="preview-slide-container"]');
      await expect(slideContainer).toBeVisible();
      
      // Should show dot navigation
      const dotNavigation = page.locator('[data-testid="preview-dot-navigation"]');
      await expect(dotNavigation).toBeVisible();
      
      const dots = dotNavigation.locator('[data-testid="nav-dot"]');
      await expect(dots).toHaveCount(4);
      
      // Test navigation in preview
      const secondDot = dots.nth(1);
      await secondDot.click();
      
      // Should switch to second slide
      const activeSlide = page.locator('[data-testid="active-slide"]');
      await expect(activeSlide).toHaveAttribute('data-slide-index', '1');
    });

    test('should sync preview navigation with main viewer', async ({ page }) => {
      const collectionId = await createTestCollection(page, {
        title: 'Collection for Sync Testing',
        hasSEO: true,
        hasValidAssets: true,
        assetCount: 3
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Open side-by-side preview
      const sideBySidePreview = page.locator('[data-testid="side-by-side-preview"]');
      await sideBySidePreview.click();
      
      // Navigate in main editor view
      const mainDots = page.locator('[data-testid="main-dot-navigation"] [data-testid="nav-dot"]');
      await mainDots.nth(2).click();
      
      // Preview should sync to same slide
      const previewActiveSlide = page.locator('[data-testid="preview-active-slide"]');
      await expect(previewActiveSlide).toHaveAttribute('data-slide-index', '2');
      
      // Navigate in preview
      const previewDots = page.locator('[data-testid="preview-dot-navigation"] [data-testid="nav-dot"]');
      await previewDots.nth(0).click();
      
      // Main view should sync
      const mainActiveSlide = page.locator('[data-testid="main-active-slide"]');
      await expect(mainActiveSlide).toHaveAttribute('data-slide-index', '0');
    });
  });

  test.describe('Error handling and edge cases', () => {
    test('should handle API errors during publishing gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/publishing/collections/*/publish', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error during publish' })
        });
      });

      const collectionId = await createTestCollection(page, {
        title: 'Collection for Error Testing',
        hasSEO: true,
        hasValidAssets: true
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Attempt to publish
      await publishCollection(page, 'This should fail');
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="publish-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Failed to publish');
      
      // Collection status should remain unchanged
      const collectionStatus = page.locator('[data-testid="collection-status"]');
      await expect(collectionStatus).toContainText('Draft');
    });

    test('should handle network interruptions during publishing', async ({ page, context }) => {
      const collectionId = await createTestCollection(page, {
        title: 'Collection for Network Testing',
        hasSEO: true,
        hasValidAssets: true
      });
      
      await page.goto(`/admin/publishing/collections/${collectionId}`);
      
      // Start publish process
      const publishNote = page.locator('[data-testid="publish-note"]');
      await publishNote.fill('Testing network interruption');
      
      const publishButton = page.locator('[data-testid="publish-button"]');
      
      // Simulate network interruption using context
      await context.setOffline(true);
      await publishButton.click();
      
      // Should show network error
      const networkError = page.locator('[data-testid="network-error"]');
      await expect(networkError).toBeVisible();
      
      // Restore network
      await context.setOffline(false);
      
      // Should offer retry option
      const retryButton = page.locator('[data-testid="retry-publish"]');
      await expect(retryButton).toBeVisible();
      await retryButton.click();
      
      // Should complete successfully
      const successMessage = page.locator('[data-testid="publish-success"]');
      await expect(successMessage).toBeVisible();
    });
  });

  // Helper functions
  async function setupPublishingTestData(page: Page) {
    // Setup test data for publishing tests
    // This would create necessary collections, assets, etc.
  }

  async function createTestCollection(page: Page, options: {
    title: string;
    hasSEO: boolean;
    hasValidAssets: boolean;
    assetIssues?: string[];
    assetCount?: number;
  }): Promise<string> {
    // Create test collection with specified characteristics
    // Return collection ID
    return 'test-collection-id';
  }

  async function publishCollection(page: Page, note: string) {
    const publishNote = page.locator('[data-testid="publish-note"]');
    await publishNote.fill(note);
    
    const publishButton = page.locator('[data-testid="publish-button"]');
    await publishButton.click();
    
    const successMessage = page.locator('[data-testid="publish-success"]');
    await expect(successMessage).toBeVisible();
  }

  async function cleanupTestCollection(page: Page, collectionId: string) {
    // Clean up test collection data
  }
});