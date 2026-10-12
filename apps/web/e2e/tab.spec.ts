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

const owed = (page: Page, name: string) =>
  page.locator('div', { has: page.getByText(`${name} is owed`) }).last();
const row = (page: Page, state: string) => page.getByText(new RegExp(`, \\w+, ${state}$`));
const stamp = (page: Page) => page.getByText('Guilty', { exact: true });

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

test('A files Trash Jenga, B pleads guilty live, A sees the stamp and the pill bump', async ({
  browser,
}, info) => {
  const { a, b } = await pair(browser);
  await file(a, 'Trash Jenga');
  await expect(a.getByRole('button', { name: 'Undo' })).toBeVisible();
  const pill = await owed(a, 'Maya').getByText('1 dish load').elementHandle();

  await expect(b.getByText('Maya says you did this.')).toBeVisible(live);
  await shot(b, info, 'B: the plea card');
  await b.getByRole('button', { name: 'Guilty' }).click();

  await expect(stamp(a)).toBeVisible(live);
  await shot(a, info, 'A: the stamp');
  // The pill re-mounted with its bump, and the filing toast lost its Undo once the plea arrived.
  await expect.poll(() => pill!.evaluate((el) => el.isConnected)).toBe(false);
  await expect(owed(a, 'Maya').getByText('1 dish load')).toHaveClass(/bump/);
  await expect(a.getByRole('button', { name: 'Undo' })).toBeHidden();
  await expect(row(a, 'guilty')).toHaveCount(1);
});

test('B appeals, A sees the appeal card live and upholds; the charge counts again', async ({
  browser,
}, info) => {
  const { a, b } = await pair(browser);
  await file(a, 'The Phantom Sip');
  await b.getByRole('button', { name: 'Appeal' }).click(live);

  await expect(a.getByText('Alex appeals.')).toBeVisible(live);
  await expect(owed(a, 'Maya').getByText('nothing')).toBeVisible();
  await shot(a, info, 'A: the appeal card');
  await a.getByRole('button', { name: 'Uphold' }).click();

  await expect(stamp(a)).toBeVisible();
  await expect(row(a, 'upheld')).toHaveCount(1);
  await expect(owed(a, 'Maya').getByText('1 coffee')).toBeVisible();
  await expect(stamp(b)).toBeVisible(live);
  await expect(row(b, 'upheld')).toHaveCount(1);
  await expect(owed(b, 'Maya').getByText('1 coffee')).toBeVisible();
  await shot(b, info, 'B: upheld');
});

test('Undo inside 10 seconds removes the charge for both', async ({ browser }) => {
  const { a, b } = await pair(browser);
  await file(a, 'Snooze Roulette');
  await expect(b.getByText('Maya says you did this.')).toBeVisible(live);
  await a.getByRole('button', { name: 'Undo' }).click();

  await expect(b.getByText('Maya says you did this.')).toBeHidden(live);
  await expect(row(a, 'pending')).toHaveCount(0);
  await expect(owed(a, 'Maya').getByText('nothing')).toBeVisible();
});

test('the 11th charge in 24 hours is refused with the friendly message', async ({ browser }, info) => {
  const { a } = await pair(browser);
  for (let i = 0; i < 10; i++) {
    await file(a, 'Midnight Crumbs');
    await expect(row(a, 'pending')).toHaveCount(i + 1);
  }
  await file(a, 'Midnight Crumbs');
  await expect(a.getByText('The court needs a break')).toBeVisible();
  await expect(a.getByText('Ten charges in a day is plenty. Try again tomorrow.')).toBeVisible();
  await shot(a, info, 'A: the 11th charge');
  await expect(row(a, 'pending')).toHaveCount(10);
});
