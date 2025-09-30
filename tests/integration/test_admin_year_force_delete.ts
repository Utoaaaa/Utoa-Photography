import { test, expect } from '@playwright/test';

// Covers the Force Delete flow for a Year that has collections
// Preconditions: none (test creates its own year + collection + assets)

test.describe('Admin Years - Force Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': process.env.TEST_CF_ACCESS_TOKEN || 'test-token'
    });
  });

  test('force delete a year with collections', async ({ page }) => {
    // Create a year and a collection
    const yearRes = await page.request.post('/api/years', { data: { label: 'ForceDel Year', status: 'published' } });
    expect(yearRes.status()).toBe(201);
    const year = await yearRes.json();

    const colRes = await page.request.post(`/api/years/${year.id}/collections`, { data: { slug: 'fd-col', title: 'FD Collection', status: 'draft' } });
    expect(colRes.status()).toBe(201);

    // Visit Admin Years
    await page.goto('/admin/years');

    // Find the created year row
    const row = page.locator('[data-testid="year-item"]').filter({ hasText: 'ForceDel Year' });
    await expect(row).toBeVisible();

    // Delete button should be disabled (has collections)
    const delBtn = row.getByTestId('delete-year-btn');
    await expect(delBtn).toBeDisabled();

    // Click Force Delete…
    await row.getByTestId('force-delete-year-btn').click();

    // Confirm dialog
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('confirm-force-delete-btn').click();

    // Expect success message and the row to disappear
    const success = page.getByTestId('success-message');
    await expect(success).toContainText('Deleted');

    await expect(row).toHaveCount(0);

    // API sanity: GET should be 404
    const getRes = await page.request.get(`/api/years/${year.id}`);
    expect(getRes.status()).toBe(404);
  });
});
