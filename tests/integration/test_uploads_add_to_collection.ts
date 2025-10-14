import { test } from '@playwright/test';

// Validate: Uploads page add-to-collection dialog flow (T041) works end-to-end

test.describe('Uploads add-to-collection flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': process.env.TEST_CF_ACCESS_TOKEN || 'test-token'
    });
  });

  test.skip('add selected assets to a collection from uploads (legacy /admin/collections)', async () => {
    // TODO(collections-workspace): rewrite verification against the year workspace UI.
  });
});
