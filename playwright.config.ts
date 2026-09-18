import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4180/abngandmingweb/', trace: 'retain-on-failure' },
  webServer: { command: 'node tests/serve.mjs', url: 'http://127.0.0.1:4180/abngandmingweb/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } } },
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
  ],
});
