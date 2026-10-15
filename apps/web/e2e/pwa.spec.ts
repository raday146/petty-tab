import { expect, test } from '@playwright/test';

// plan.md M6: installable, and opening the app offline shows the shell and a clear message. Against the
// production build on :3101 (see playwright.config.ts), the way a phone gets it.
test.use({
  baseURL: 'http://localhost:3101',
  serviceWorkers: 'allow',
  viewport: { width: 390, height: 844 },
});

test('the manifest makes the app installable (Chrome reports no installability errors)', async ({ page }) => {
  await page.goto('/');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'Petty Tab', display: 'standalone', start_url: '/' });
  for (const size of [180, 192, 512]) {
    const icon = await page.request.get(`/icons/${size}`);
    expect(icon.headers()['content-type']).toBe('image/png');
    const png = await icon.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
  }
  const cdp = await page.context().newCDPSession(page);
  await expect
    .poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors)
    .toEqual([]);
});

test('opened offline, the app shows its shell and says it is offline; back online it carries on', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Once the worker controls the page, a reload fills its cache with everything the shell loads.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('button', { name: 'Start a tab' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
  await expect(page.getByText("The tab catches up as soon as you're back.")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Start a tab' })).toBeVisible();
});

test('online but the server does not answer: a retry screen, not a blank page', async ({ page }) => {
  // A dead link or a server that is down: the phone is online, the API is not there.
  await page.route('**/api/me', (route) => route.abort('connectionrefused'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "Can't reach the tab" })).toBeVisible();

  await page.unroute('**/api/me');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Start a tab' })).toBeVisible();
});
