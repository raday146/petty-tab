import type { Browser, Page } from '@playwright/test';

// Two people are two browser contexts (two session cookies).

export async function person(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  return context.newPage();
}

export async function pick(page: Page, name: string, animal: RegExp): Promise<void> {
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: animal }).first().click();
  await page.getByRole('button', { name: /^Continue as/ }).click();
}

/** A starts a tab and returns the invite link from the invite sheet. */
export async function startTab(page: Page, name: string, animal: RegExp): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a tab' }).click();
  await pick(page, name, animal);
  const sheet = page.getByRole('dialog');
  const link = await sheet.getByText('/j/').textContent();
  await sheet.getByRole('button', { name: 'Open our tab' }).click();
  return `https://${link}`;
}

export const path = (link: string): string => new URL(link).pathname;

/** Maya the Cat starts a tab, Alex the Bear joins it; both see the scoreboard. */
export async function pair(browser: Browser): Promise<{ a: Page; b: Page }> {
  const a = await person(browser);
  const link = await startTab(a, 'Maya', /Cat/);
  const b = await person(browser);
  await b.goto(path(link));
  await pick(b, 'Alex', /Bear/);
  for (const p of [a, b]) await p.getByText('Dead even').waitFor({ timeout: 2000 });
  return { a, b };
}
