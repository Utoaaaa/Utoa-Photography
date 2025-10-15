import { defineConfig, devices } from '@playwright/test';

const includeWip = process.env.E2E_INCLUDE_WIP === '1';

// Stable suites that should pass on main CI/dev runs
const stableTests = [
  'test_admin_cms.ts',
  'test_image_workflow.ts',
  'test_console_clean.ts',
  'test_a11y_scan.ts',
  'test_admin_keyboard_sorting.ts',
  'test_a11y_dialog.ts',
  'test_a11y_dialog_focus_trap.ts',
  'test_a11y_forms.ts',
  'test_admin_a11y_live.ts',
  'test_admin_year_force_delete.ts',
  'test_uploads_add_to_collection.ts',
  'test_admin_keyboard_navigation.ts', // T062
  'test_audit_retention.ts', // T063
];

// WIP/experimental suites (intentionally failing or pending implementation)
const wipTests = [
  'test_year_page.ts',
];

export default defineConfig({
  testDir: 'tests/integration',
  // Default: run only stable suites. To include WIP suites, run with E2E_INCLUDE_WIP=1
  testMatch: includeWip ? [...stableTests, ...wipTests] : stableTests,
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
    command: 'next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      BYPASS_ACCESS_FOR_TESTS: 'true',
      NODE_ENV: 'development',
    },
  },
  reporter: 'list',
});
