import type { Browser, Page } from '@playwright/test';

// Two people are two browser contexts (two session cookies).

export async function person(browser: Browser, { asked = true } = {}): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // The one-time notifications offer (M6) would cover the tab; settings.spec.ts opts back in.
  if (asked) await context.addInitScript(() => localStorage.setItem('pt-asked', '1'));
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
  // Step 2 of 3: the rules, kept at their defaults (weekly, every crime).
  await page.getByRole('button', { name: 'Create the tab' }).click();
  const sheet = page.getByRole('dialog');
  const link = await sheet.getByText('/j/').textContent();
  await sheet.getByRole('button', { name: 'Open our tab' }).click();
  return `https://${link}`;
}

export const path = (link: string): string => new URL(link).pathname;

/** Opens an invite link and accepts the rules (spec §4); the animal picker comes next. */
export async function openInvite(page: Page, link: string): Promise<void> {
  await page.goto(path(link));
  await page.getByRole('button', { name: 'Accept the rules & join' }).click();
}

/** Maya the Cat starts a tab, Alex the Bear joins it; both see the scoreboard. */
export async function pair(browser: Browser): Promise<{ a: Page; b: Page }> {
  const a = await person(browser);
  const link = await startTab(a, 'Maya', /Cat/);
  const b = await person(browser);
  await openInvite(b, link);
  await pick(b, 'Alex', /Bear/);
  for (const p of [a, b]) await p.getByText('Dead even').waitFor({ timeout: 2000 });
  return { a, b };
}
