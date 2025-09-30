import { test, expect } from '@playwright/test';

// Verify console on the photo page is clean in dev
// We filter noisy Next dev overlay logs by severity and known messages.

test('photo page console remains clean', async ({ page }) => {
  const messages: { type: string; text: string }[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    // Collect all but ignore benign info logs
    if (type !== 'info') {
      messages.push({ type, text });
    }
  });

  await page.goto('/2024/test-collection');

  // Give time for client hydration and image preloads
  await page.waitForTimeout(500);

  // Define disallowed patterns
  const bannedPatterns = [
    /hydration mismatch/i,
    /didn't match the client properties/i,
    /The resource.*was preloaded using link preload but not used/i,
    /Cloudflare account hash not configured/i,
    /Failed to load resource/i,
    /404/,
  ];

  const offenders = messages.filter(m => bannedPatterns.some(rx => rx.test(m.text)));

  if (offenders.length > 0) {
    console.log('Console offenders:', offenders.map(o => `${o.type}: ${o.text}`).join('\n'));
  }

  expect(offenders).toHaveLength(0);
});
