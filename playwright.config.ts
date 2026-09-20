import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: false,
  workers: 1, // one shared Metro/Expo web dev server backs every test — parallel Chrome instances race the same origin and flake
  retries: 0,
  reporter: [['list']],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8081',
    channel: 'chrome', // drive the system-installed Chrome — this sandbox can't download Playwright's bundled browser
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
