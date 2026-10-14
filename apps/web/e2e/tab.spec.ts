import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { pair } from './people';

// spec §8–9 end to end: two people on one tab, live over SSE. "Live" means within 2 seconds.
const live = { timeout: 2000 };
// The stamp slam is motion; under reduced motion it is not drawn (the row's text carries the status).
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

async function file(page: Page, crime: string): Promise<void> {
  await page.getByRole('button', { name: 'Log a petty crime' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(crime) })
    .click();
}

/** Opens the tally sheet (a tap on the scoreboard) and returns what `name` is owed in it. */
async function owed(page: Page, name: string) {
  const sheet = page.getByRole('dialog', { name: 'Who owes what' });
  if (!(await sheet.isVisible())) await page.getByRole('button', { name: /Who owes what/ }).click();
  return sheet.locator('div', { has: page.getByText(`${name} is owed`) }).last();
}
const lead = (page: Page, text: string) => page.getByText(text, { exact: true });
const row = (page: Page, state: string) => page.getByText(new RegExp(`, \\w+, ${state}$`));
const stamp = (page: Page) => page.getByText('Guilty', { exact: true });

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

test('A files Trash Jenga, B pleads guilty live, A sees the stamp and the score bump', async ({
  browser,
}, info) => {
  const { a, b } = await pair(browser);
  await file(a, 'Trash Jenga');
  await expect(a.getByRole('button', { name: 'Undo' })).toBeVisible();
  const line = await lead(a, 'Maya leads by 1').elementHandle();

  await expect(b.getByText('Maya says you did this.')).toBeVisible(live);
  await shot(b, info, 'B: the plea card');
  await b.getByRole('button', { name: 'Fine, I did it' }).click();

  await expect(stamp(a)).toBeVisible(live);
  await shot(a, info, 'A: the stamp');
  // The lead line re-mounted with its bump, and the filing toast lost its Undo once the plea arrived.
  await expect.poll(() => line!.evaluate((el) => el.isConnected)).toBe(false);
  await expect(lead(a, 'Maya leads by 1')).toHaveClass(/bump/);
  await expect(a.getByRole('button', { name: 'Undo' })).toBeHidden();
  await expect(row(a, 'guilty')).toHaveCount(1);
  await expect((await owed(a, 'Maya')).getByText('1 dish load')).toBeVisible();
});

test('B cries foul, A sees the card live and says nice try; the charge counts again', async ({
  browser,
}, info) => {
  const { a, b } = await pair(browser);
  await file(a, 'The Phantom Sip');
  await b.getByRole('button', { name: 'Not me!' }).click(live);

  await expect(a.getByText('Alex cries foul.')).toBeVisible(live);
  await expect(lead(a, 'Dead even')).toBeVisible();
  await shot(a, info, 'A: the cries-foul card');
  await a.getByRole('button', { name: 'Nice try' }).click();

  await expect(stamp(a)).toBeVisible();
  await expect(row(a, 'counts')).toHaveCount(1);
  await expect((await owed(a, 'Maya')).getByText('1 coffee')).toBeVisible();
  await expect(stamp(b)).toBeVisible(live);
  await expect(row(b, 'counts')).toHaveCount(1);
  await expect((await owed(b, 'Maya')).getByText('1 coffee')).toBeVisible();
  await shot(b, info, 'B: it counts');
});

test('Undo inside 10 seconds removes the charge for both', async ({ browser }) => {
  const { a, b } = await pair(browser);
  await file(a, 'Snooze Roulette');
  await expect(b.getByText('Maya says you did this.')).toBeVisible(live);
  await a.getByRole('button', { name: 'Undo' }).click();

  await expect(b.getByText('Maya says you did this.')).toBeHidden(live);
  await expect(row(a, 'pending')).toHaveCount(0);
  await expect((await owed(a, 'Maya')).getByText('nothing')).toBeVisible();
});

test('there is no daily cap: an 11th charge in a row is filed', async ({ browser }) => {
  const { a } = await pair(browser);
  for (let i = 0; i < 11; i++) {
    await file(a, 'Midnight Crumbs');
    await expect(row(a, 'pending')).toHaveCount(i + 1);
  }
});
