import { defineConfig, devices } from '@playwright/test';

// Own port so e2e never talks to another local app on :3000.
const port = 3100;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    // art.css stops its idle loops under reduced motion, so drawings are still and comparable.
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: [
    {
      command: `next dev -p ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    // The pairing tests need the API (and its database: `docker compose up -d db && pnpm db:migrate`).
    {
      command: 'pnpm --filter @petty-tab/api build && pnpm --filter @petty-tab/api start',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
