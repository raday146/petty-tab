import { expect, test, type Browser, type Page } from '@playwright/test';

// spec §4 end to end: two people, two browser contexts (two cookies), one tab.

async function person(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  return context.newPage();
}

async function pick(page: Page, name: string, animal: RegExp): Promise<void> {
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: animal }).first().click();
  await page.getByRole('button', { name: /^Continue as/ }).click();
}

/** A starts a tab and returns the invite link from the invite sheet. */
async function startTab(page: Page, name: string, animal: RegExp): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a tab' }).click();
  await pick(page, name, animal);
  const sheet = page.getByRole('dialog');
  const link = await sheet.getByText('/j/').textContent();
  await sheet.getByRole('button', { name: 'Open our tab' }).click();
  return `https://${link}`;
}

const path = (link: string): string => new URL(link).pathname;

test('A starts a tab, B joins with another animal, both see the pair', async ({ browser }) => {
  const a = await person(browser);
  const link = await startTab(a, 'Maya', /Cat/);
  await expect(a.getByText('Waiting for your partner')).toBeVisible();

  // Reloading the waiting state shows the same link (spec §4.2).
  await a.reload();
  await expect(a.getByRole('main').getByText(path(link))).toBeVisible();

  const b = await person(browser);
  await b.goto(path(link));
  await expect(b.getByText(/invited you/)).toContainText('Maya');
  // The inviter's animal is taken (spec §4.3).
  await expect(b.getByRole('button', { name: /Cat/ }).first()).toBeDisabled();
  await pick(b, 'Alex', /Bear/);

  // Both see the completed pair within 2 seconds.
  const scoreboard = (p: Page) => p.getByText('Dead even');
  await expect(scoreboard(b)).toBeVisible({ timeout: 2000 });
  await expect(scoreboard(a)).toBeVisible({ timeout: 2000 });
  await expect(a.getByText('Alex').first()).toBeVisible();
});

test('an invite opened while already in a pair is not consumed', async ({ browser }) => {
  const a = await person(browser);
  const link = await startTab(a, 'Sam', /Pup/);
  const c = await person(browser);
  await startTab(c, 'Chris', /Lion/);

  await c.goto(path(link));
  await expect(c.getByRole('heading', { name: 'You already have a tab.' })).toBeVisible();

  const b = await person(browser);
  await b.goto(path(link));
  await expect(b.getByText(/invited you/)).toBeVisible();
});

test('opening your own link shows the waiting state', async ({ browser }) => {
  const a = await person(browser);
  const link = await startTab(a, 'Noa', /Sheep/);
  await a.goto(path(link));
  await expect(a.getByText('Waiting for your partner')).toBeVisible();
  await expect(a).toHaveURL('/');
});

test('used and unknown links show the friendly page', async ({ browser }) => {
  const a = await person(browser);
  const link = await startTab(a, 'Dana', /Capybara/);
  const b = await person(browser);
  await b.goto(path(link));
  await pick(b, 'Eli', /Bear/);
  await expect(b.getByText('Dead even')).toBeVisible();

  const late = await person(browser);
  await late.goto(path(link));
  await expect(late.getByRole('heading', { name: /expired or was already used/ })).toBeVisible();
  await late.goto('/j/not-a-real-token');
  await expect(late.getByRole('heading', { name: /expired or was already used/ })).toBeVisible();
  await late.getByRole('button', { name: 'Start a tab' }).click();
  await expect(late.getByRole('button', { name: 'Start a tab' })).toBeVisible();
});

test('rename, change animal, and leave', async ({ browser }) => {
  const a = await person(browser);
  const link = await startTab(a, 'Roni', /Raccoon/);
  const b = await person(browser);
  await b.goto(path(link));
  await pick(b, 'Tal', /Turtle/);
  await expect(b.getByText('Dead even')).toBeVisible();

  await b.getByRole('button', { name: 'Change your name or animal' }).click();
  await expect(b.getByRole('button', { name: /Raccoon/ }).first()).toBeDisabled();
  await pick(b, 'Tali', /Rabbit/);
  await expect(b.getByRole('button', { name: 'Change your name or animal' })).toContainText('Tali');

  await b.getByRole('button', { name: 'Change your name or animal' }).click();
  await b.getByRole('button', { name: 'Leave the tab' }).click();
  await b.getByRole('button', { name: 'Leave the tab' }).click();
  await expect(b.getByRole('button', { name: 'Start a tab' })).toBeVisible();
  await a.reload();
  await expect(a.getByRole('button', { name: 'Start a tab' })).toBeVisible();
});
