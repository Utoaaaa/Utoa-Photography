import { test, expect } from '@playwright/test';

// Verify form error a11y: aria-invalid and aria-describedby

test.describe('Admin forms a11y', () => {
  test('Years form shows aria-invalid + describedby on empty label', async ({ page }) => {
    await page.goto('/admin/years');
    await page.click('[data-testid="create-year-btn"]');
    await page.click('[data-testid="save-year-btn"]');

    const input = page.locator('#year-label-input');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('aria-describedby', 'year-label-error');

    const error = page.locator('#year-label-error');
    await expect(error).toBeVisible();
  });

  test('Collections form shows field errors', async ({ page }) => {
    const res = await page.request.post('/api/years', { data: { label: `A11y ${Date.now()}`, status: 'draft' } });
    expect(res.ok()).toBeTruthy();
    const year = await res.json();

    await page.goto(`/admin/years/${encodeURIComponent(year.id)}`);
    await page.waitForSelector('[data-testid="collection-manager"]');

    await page.click('[data-testid="create-collection-btn"]');
    await page.click('[data-testid="save-collection-btn"]');

    const slugInput = page.locator('#collection-slug-input');
    await expect(slugInput).toHaveAttribute('aria-invalid', 'true');
    await expect(slugInput).toHaveAttribute('aria-describedby', 'collection-slug-error');

    const titleInput = page.locator('#collection-title-input');
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    await expect(titleInput).toHaveAttribute('aria-describedby', 'collection-title-error');

    await expect(page.locator('#collection-slug-error')).toBeVisible();
    await expect(page.locator('#collection-title-error')).toBeVisible();
  });
});
