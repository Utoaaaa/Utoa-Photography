import { test, expect } from '@playwright/test';

// Dialog a11y: role, aria-modal, labelledby, initial focus, Escape to close

test('AccessibleDialog has proper a11y and Escape closes it', async ({ page }) => {
  // Ensure a year exists via API
  const label = `A11y Year ${Date.now()}`;
  const createRes = await page.request.post('/api/years', {
    data: { label, status: 'draft' },
  });
  expect(createRes.ok()).toBeTruthy();

  // Open admin years page
  await page.goto('/admin/years');
  await page.waitForSelector('[data-testid="year-item"]');

  // Find the row and click delete
  const row = page.locator('[data-testid="year-item"]').filter({ hasText: label });
  await expect(row).toBeVisible();
  await row.locator('[data-testid="delete-year-btn"]').click();

  const dialog = page.locator('[data-testid="confirm-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title');
  await expect(page.locator('#confirm-title')).toBeVisible();

  // Initial focus should land on data-autofocus button
  const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
  await expect(confirmBtn).toBeFocused();

  // Press Escape to close
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
