import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, SESSION_FILE } from './tests/e2e/support/session.ts';

// Test helpers use the same local Supabase URL and publishable key as the app.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  testDir: 'tests/e2e',
  // Every test shares one user whose theme is database state; running serially keeps one test
  // from changing what another is reading.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: SESSION_FILE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 800 },
        storageState: SESSION_FILE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    stdout: 'pipe',
  },
});
