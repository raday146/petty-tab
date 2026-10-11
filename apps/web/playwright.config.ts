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
  webServer: {
    command: `next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
