import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('test-results/axe');

async function scanAndSave(page: Page, url: string, filename: string) {
  await page.goto(url);
  // wait for network to be idle-ish
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(200);

  const results: AxeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  // ensure dir
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(results, null, 2), 'utf-8');

  // Gate: serious/critical must be 0
  const violations = results.violations.filter((v) => ['serious', 'critical'].includes((v.impact as string) || 'minor'));
  expect(violations, `${url} has serious/critical a11y issues`).toHaveLength(0);
}

// Pages to scan
const pages = ['/admin/years', '/admin/collections', '/admin/uploads'];

for (const p of pages) {
  test(`axe scan ${p}`, async ({ page }) => {
    await scanAndSave(page, p, `${p.replace(/\//g, '_') || 'home'}.axe.json`);
  });
}
