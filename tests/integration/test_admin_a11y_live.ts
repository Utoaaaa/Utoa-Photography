import { test, expect } from '@playwright/test';

// Validate ARIA live region announcements on reorder actions

test.describe('Admin A11y Live Announcements', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': process.env.TEST_CF_ACCESS_TOKEN || 'test-token'
    });
  });

  test('years page announces reorder', async ({ page }) => {
    // Prepare deterministic years
    const y1 = await (await page.request.post('/api/years', { data: { label: 'Live-Y1', status: 'draft' } })).json();
    const y2 = await (await page.request.post('/api/years', { data: { label: 'Live-Y2', status: 'draft' } })).json();
    await page.request.put(`/api/years/${y1.id}`, { data: { order_index: '2.0' } });
    await page.request.put(`/api/years/${y2.id}`, { data: { order_index: '1.0' } });

    await page.goto('/admin/years');

    const items = page.locator('[data-testid="year-item"]');
    await items.first().locator('[data-testid="move-year-down"]').click();

    // Announcement should update
    await expect(page.locator('[data-testid="years-announce"]')).toContainText('Reordered');
  });

  test('collections section announces reorder', async ({ page }) => {
    // Setup one year and two collections
    const y = await (await page.request.post('/api/years', { data: { label: 'Live-Y-Col', status: 'draft' } })).json();
    await page.request.post(`/api/years/${y.id}/collections`, { data: { slug: 'live-col-1', title: 'Live Col 1', status: 'draft' } });
    await page.request.post(`/api/years/${y.id}/collections`, { data: { slug: 'live-col-2', title: 'Live Col 2', status: 'draft' } });

    await page.goto(`/admin/years/${encodeURIComponent(y.id)}`);
    await page.waitForSelector('[data-testid="collection-manager"]');

    const items = page.locator('[data-testid="collection-item"]');
    await items.first().locator('[data-testid="move-collection-down"]').click();

    await expect(page.locator('[data-testid="collection-announce"]')).toContainText('Reordered');
  });
});
