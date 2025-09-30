import { test, expect } from '@playwright/test';

// Verify focus trap within AccessibleDialog cycles with Tab/Shift+Tab

test('AccessibleDialog traps focus and cycles with Tab/Shift+Tab', async ({ page }) => {
  // Ensure a year exists via API
  const label = `Trap Year ${Date.now()}`;
  const createRes = await page.request.post('/api/years', {
    data: { label, status: 'draft' },
  });
  expect(createRes.ok()).toBeTruthy();

  await page.goto('/admin/years');
  await page.waitForSelector('[data-testid="year-item"]');

  // Open dialog
  const row = page.locator('[data-testid="year-item"]').filter({ hasText: label });
  await expect(row).toBeVisible();
  await row.locator('[data-testid="delete-year-btn"]').click();

  const dialog = page.locator('[data-testid="confirm-dialog"]');
  await expect(dialog).toBeVisible();

  const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
  await expect(confirmBtn).toBeFocused();

  // Next focusable should be the Cancel button
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });

  // Tab from confirm -> cancel
  await page.keyboard.press('Tab');
  await expect(cancelBtn).toBeFocused();

  // Tab again should cycle back to confirm
  await page.keyboard.press('Tab');
  await expect(confirmBtn).toBeFocused();

  // Shift+Tab from confirm should go to cancel
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  await expect(cancelBtn).toBeFocused();
});
