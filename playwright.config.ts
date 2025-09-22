import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  // Run only explicit Playwright E2E specs
  testMatch: [
    'test_admin_cms.ts',
    'test_image_workflow.ts',
    'test_year_page.ts',
    'test_publishing_flow.ts',
  ],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    headless: true,
    viewport: { width: 1280, height: 800 },
    // Default to Chromium for speed/stability; can add others later
    browserName: 'chromium',
  },
  webServer: {
    command: 'BYPASS_ACCESS_FOR_TESTS=true next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  reporter: 'list',
});
