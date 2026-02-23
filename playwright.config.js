const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const PORT = 5173;
const TEST_FIXTURES_DIR = path.join(__dirname, 'tests/e2e/fixtures');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // E2E tests must run serially due to extension state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,  // Single worker for extension testing
  reporter: [['json', { outputFile: 'test-results/e2e-results.json' }]],
  timeout: 30000,  // 30s timeout for E2E tests
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        firefoxUserPrefs: {
          'extensions.activeThemeID': 'firefox-compact-dark@mozilla.org'
        }
      },
    },
  ],

  webServer: {
    command: 'npm run test:server',
    url: `http://localhost:${PORT}/test-form.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
