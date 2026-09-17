import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Run only against an isolated local build with UTOA_ENABLE_LOCAL_TEST_DATA=true.
const base = new URL(process.env.UTOA_SMOKE_BASE_URL || 'http://127.0.0.1:3047');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Local regression only');
assert.equal(base.protocol, 'http:');
const root = fileURLToPath(new URL('../../', import.meta.url));
const checks = [];
const record = (name, detail) => checks.push({ name, ...detail });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : entry.name === 'route.ts' ? [file] : [];
});

for (const file of walk(path.join(root, 'src/app/api'))) {
  const source = fs.readFileSync(file, 'utf8');
  const route = '/' + path.relative(path.join(root, 'src/app'), file).replace(/\/route.ts$/, '')
    .replace(/\[[^\]]+\]/g, '11111111-1111-4111-8111-111111111111');
  for (const match of source.matchAll(/export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/g)) {
    for (const authorizedHeader of [false, true]) {
      const response = await fetch(new URL(route, base), {
        method: match[1], redirect: 'manual',
        headers: { 'content-type': 'application/json', ...(authorizedHeader ? { authorization: 'Bearer invalid-test-token' } : {}) },
        body: '{}',
      });
      assert.equal(response.status, route.startsWith('/api/admin/') ? 401 : 405, `${match[1]} ${route} ${authorizedHeader ? 'fake token' : 'anonymous'}`);
      record(`${match[1]} ${route}`, { credentials: authorizedHeader ? 'fake' : 'none', status: response.status });
    }
  }
}
assert.ok(checks.length >= 80, 'Missing write-route coverage');
for (const route of ['/admin', '/api/admin/years/2026.0/locations', '/api/audit']) {
  const response = await fetch(new URL(route, base), { redirect: 'manual' });
  assert.equal(response.status, 401, route);
  record(route, { status: response.status });
}

if (process.env.UTOA_SMOKE_HTTP_ONLY !== '1') {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.E2E_CHROME_EXECUTABLE_PATH ? { executablePath: process.env.E2E_CHROME_EXECUTABLE_PATH } : {}),
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === base.origin || ['data:', 'blob:'].includes(url.protocol)
        ? route.continue() : route.abort();
    });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const route of ['/', '/2024', '/2024/city-lights-24', '/2024/city-lights-24/urban-stories']) {
        console.error(`Browser check ${viewport.width}px ${route}`);
        const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, route);
        assert.ok((await page.locator('body').innerText()).trim().length > 0);
        if (route.endsWith('/urban-stories')) {
          const sequence = page.getByRole('region', { name: 'Photos', exact: true });
          await sequence.waitFor({ state: 'visible' });
          await sequence.scrollIntoViewIfNeeded();
          const images = page.locator('img');
          assert.ok(await images.count() > 0, 'Photo viewer has no images');
          await page.waitForFunction(() => Array.from(document.images).some(img => img.complete && img.naturalWidth > 0));
        }
        record(route, { viewport, status: response.status() });
      }
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
  } finally {
    await browser.close();
  }
}
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
