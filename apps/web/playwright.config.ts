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
    // page.route() does not see requests a service worker makes; pwa.spec.ts allows it where it is tested.
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: `next dev -p ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    // pwa.spec.ts: the offline shell needs a production build (the dev runtime waits for its HMR socket).
    {
      command: 'next build && next start -p 3101',
      url: 'http://localhost:3101',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    // The pairing tests need the API (and its database: `docker compose up -d db && pnpm db:migrate`).
    {
      command: 'pnpm --filter @petty-tab/api build && pnpm --filter @petty-tab/api start',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      // Mounts POST /api/dev/seal for verdict.spec.ts; never set outside the e2e run.
      env: { E2E_HOOKS: '1' },
    },
    // Renders the sealed verdicts' cards and reels from this web server, so sharing gets real files.
    {
      command: 'pnpm --filter @petty-tab/renderer start',
      env: { WEB_URL: `http://localhost:${port}` },
      wait: { stdout: /renderer:/ },
    },
  ],
});
