import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pair, person } from './people';

// The README's screenshots, from the real app with demo data. Not part of the suite:
// SHOWCASE=1 pnpm e2e e2e/showcase.spec.ts writes raw-*.png to docs/assets/screenshots. Then, in that folder,
// put the picker and the rules side by side as 01-onboarding-wizard.png (ffmpeg hstack, a 48px transparent
// gap), rename the rest to the README's names and cut each to 256 colours (ffmpeg palettegen + paletteuse,
// dither=none), which halves the size with no visible change on these flat drawings.
test.skip(!process.env.SHOWCASE, 'SHOWCASE=1 only');
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });

const out = resolve('../../docs/assets/screenshots');
const live = { timeout: 2000 };

const shot = async (page: Page, name: string): Promise<void> => {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/${name}` });
};

test('onboarding: the animal picker and the rules', async ({ browser }) => {
  const a = await person(browser);
  await a.goto('/');
  await a.getByRole('button', { name: 'Start a tab' }).click();
  await a.getByRole('textbox').fill('Maya');
  await a.getByRole('button', { name: /Cat/ }).first().click();
  await shot(a, 'raw-01a-picker.png');
  await a.getByRole('button', { name: /^Continue as/ }).click();
  const setup = a.getByRole('main', { name: 'Set the rules' });
  await setup.getByText('2-day dash').click();
  await shot(a, 'raw-01b-rules.png');
});

test('the tab, the new crime sheet, the breakdown and the verdict', async ({ browser }) => {
  test.setTimeout(240_000);
  const { a, b } = await pair(browser);
  await a.request.post('/api/crimes', {
    data: { title: 'Dishes duty', description: '', unit: 'dish', sticker: 'dish', chore: 'them' },
  });
  // Last week: Maya wins on Alex's crimes, then a sentence is picked.
  for (const crimeKey of ['dish', 'burrito', 'burrito', 'clock']) {
    await a.request.post('/api/charges', { data: { crimeKey } });
  }
  await b.request.post('/api/charges', { data: { crimeKey: 'sip' } });
  await a.request.post('/api/dev/seal');
  const { id } = (await (await a.request.get('/api/verdicts/latest')).json()) as { id: string };
  await a.request.patch(`/api/verdicts/${id}/sentence`, { data: { sentenceKey: 'coffee7' } });
  // This week so far.
  for (const crimeKey of ['trash', 'sip', 'clock'])
    await a.request.post('/api/charges', { data: { crimeKey } });
  await b.request.post('/api/charges', { data: { crimeKey: 'movie' } });
  await a.reload();
  await expect(a.getByText(/Maya leads by/)).toBeVisible(live);
  await shot(a, 'raw-02-tab.png');

  await a.getByRole('button', { name: 'Log a petty crime' }).click();
  await a.getByRole('button', { name: '+ New crime or chore' }).click();
  const form = a.getByRole('dialog', { name: 'A crime of your own' });
  await form.getByLabel('What’s the crime?').fill('Toilet paper roulette');
  await form.getByLabel('In one line').fill('One lonely square, every time.');
  await form.getByLabel('roll').check({ force: true });
  await form.getByText('Alex’s').click();
  await shot(a, 'raw-03-new-crime.png');
  await a.keyboard.press('Escape');
  await a.reload();

  await a.getByRole('button', { name: /Who owes what/ }).click(live);
  await expect(a.getByRole('main', { name: 'The breakdown' })).toBeVisible();
  await shot(a, 'raw-04-breakdown.png');
  await a.getByRole('button', { name: 'Back to the tab' }).click();

  await a.getByRole('button', { name: /Verdict on/ }).click(live);
  await a.getByRole('button', { name: 'See the last verdict' }).click();
  await expect(a.getByRole('heading', { level: 1 })).toHaveText('Maya vs. Alex');
  // The renderer draws the card and the reel first; until then the share button reads "Printing…".
  await expect(a.getByRole('button', { name: 'Share story' })).toBeEnabled({ timeout: 120_000 });
  await shot(a, 'raw-05-verdict.png');
});
