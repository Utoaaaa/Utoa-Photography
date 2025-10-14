import { test, expect } from '@playwright/test';

test.describe('Year route redirection', () => {
  test('redirects to homepage anchor for existing year', async ({ page }) => {
    await page.goto('/2024', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/#year-2024$/);

    const section = page.locator('[data-testid="year-section"]').filter({ hasText: '2024' });
    await expect(section.first()).toBeVisible();
  });

  test('returns 404 when year does not exist', async ({ page }) => {
    const response = await page.goto('/2199');
    expect(response?.status()).toBe(404);
  });
});