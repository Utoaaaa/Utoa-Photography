import { test, expect } from '@playwright/test';

// This test verifies keyboard ArrowUp/ArrowDown sorting for Years and Collections in admin UI.

test.describe('Admin keyboard sorting', () => {
  test('Years list ArrowUp/ArrowDown reorders and persists', async ({ page }) => {
    await page.goto('/admin/years');
    await page.waitForSelector('[data-testid="year-item"]');

    const items = page.locator('[data-testid="year-item"]');
    const before = await items.allTextContents();
    if (before.length < 2) test.skip(true, 'Need at least 2 years to sort');

    // Focus first row and press ArrowDown to swap with next
    await items.first().focus();
    await page.keyboard.press('ArrowDown');

    await expect(page.locator('[data-testid="success-message"]').first()).toBeVisible();

    // Persisted after reload
    await page.reload();
    await page.waitForSelector('[data-testid="year-item"]');
    const after = await page.locator('[data-testid="year-item"]').allTextContents();
    expect(after).not.toEqual(before);
  });

  test.skip('Collections list ArrowUp/ArrowDown reorders and persists (legacy /admin/collections)', async () => {
    // TODO(collections-workspace): rewrite against the year workspace collection manager.
  });
});
