import { expect, test, type Page } from '@playwright/test';
import { expectMatchesReference } from './compare';
import { pair } from './people';

// spec §10 end to end on real data. POST /api/dev/seal (mounted with E2E_HOOKS=1) seals the pair's current
// week as if Sunday 20:00 had come; the sealing rules themselves are covered in verdicts.service.test.ts.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const live = { timeout: 2000 };

const open = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Verdict on Sunday' }).click(live);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
};
const dice = (page: Page) => page.getByRole('button', { name: 'Change the sentence', exact: true });
// The renderer draws the card and a 6 s reel per sentence, one job at a time, behind other tests' verdicts.
const rendered = { timeout: 120_000 };

/** Stands in for the phone's share sheet: records the files it is handed. */
const stubShare = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const w = window as unknown as { shared: { name: string; type: string; size: number }[] };
    w.shared = [];
    navigator.canShare = () => true;
    navigator.share = async (data) => {
      w.shared.push(...(data?.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })));
    };
  });
const shared = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { shared: { name: string; type: string; size: number }[] }).shared,
  );

test('Maya wins the week: the card, the lock on her share, served and confirmed', async ({ browser }) => {
  test.setTimeout(240_000);
  const { a, b } = await pair(browser);
  await expect(a.getByText('First verdict Sunday 20:00')).toBeVisible();
  // Reference 12's top crimes: Blanket Burrito ×2, then Snooze Roulette (most recent), then Dishwasher Terrorism.
  for (const crimeKey of ['dish', 'burrito', 'burrito', 'clock']) {
    expect((await a.request.post('/api/charges', { data: { crimeKey } })).ok()).toBe(true);
  }
  expect((await a.request.post('/api/dev/seal')).ok()).toBe(true);
  const { id } = (await (await a.request.get('/api/verdicts/latest')).json()) as { id: string };
  await a.request.patch(`/api/verdicts/${id}/sentence`, { data: { sentenceKey: 'coffee7' } });

  // Both see the owed sentence on the tab, live.
  for (const p of [a, b]) {
    await expect(p.getByText('Alex still owes Maya: 7 days of morning coffee duty')).toBeVisible(live);
  }

  await open(a);
  await expect(a.getByRole('heading', { level: 1 })).toHaveText('Maya vs. Alex');
  await expect(a.getByRole('button', { name: 'Share story' })).toBeEnabled(rendered);
  await expectMatchesReference(a, '12-verdict-card.png');

  // Winner first on the loser's phone too; no dice for the loser, and the loser's share locks nothing.
  await open(b);
  await expect(b.getByRole('heading', { level: 1 })).toHaveText('Maya vs. Alex');
  await expect(dice(b)).toHaveCount(0);
  await stubShare(b);
  await b.getByRole('button', { name: 'Share story' }).click(rendered);
  // spec §11: the reel goes to the share sheet, and the story preview opens behind it.
  await expect
    .poll(() => shared(b))
    .toEqual([{ name: 'petty-tab-verdict.mp4', type: 'video/mp4', size: expect.any(Number) }]);
  await expect(b.getByRole('main', { name: 'Your story' })).toBeVisible();
  await expect(b.getByText('@maya')).toBeVisible();
  await b.getByRole('button', { name: 'Close the story' }).click();
  await expect(dice(a)).toBeVisible();

  await stubShare(a);
  await a.getByRole('button', { name: 'Send to WhatsApp' }).click();
  await expect.poll(() => shared(a)).toHaveLength(1);
  await expect(dice(a)).toHaveCount(0);

  await b.getByRole('button', { name: 'I served it' }).click();
  await expect(b.getByRole('button', { name: 'Waiting for Maya' })).toBeDisabled();
  await a.getByRole('button', { name: "Confirm it's served" }).click(live);
  await expect(b.getByText('Served and confirmed.')).toBeVisible(live);

  await a.getByRole('button', { name: 'Back to the tab' }).click();
  await expect(a.getByRole('button', { name: 'Verdict on Sunday' })).toBeVisible();
  await expect(a.getByText(/still owes/)).toHaveCount(0);
});

test('a tie: Dead even, no sentence, nothing owed', async ({ browser }) => {
  test.setTimeout(150_000);
  const { a, b } = await pair(browser);
  await a.request.post('/api/charges', { data: { crimeKey: 'sip' } });
  await b.request.post('/api/charges', { data: { crimeKey: 'clock' } });
  await a.request.post('/api/dev/seal');
  await open(b);
  await expect(b.getByRole('heading', { level: 1 })).toHaveText('Dead even');
  await expect(b.getByText('No one owes anyone. Suspicious.')).toBeVisible();
  await expect(dice(b)).toHaveCount(0);
  await expect(b.getByRole('button', { name: 'I served it' })).toHaveCount(0);

  // No reel for a tie; the card is shared, or downloaded where files cannot be shared.
  await expect(b.getByRole('button', { name: 'Share story' })).toHaveCount(0);
  await b.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  const download = b.waitForEvent('download');
  await b.getByRole('button', { name: 'Share card' }).click(rendered);
  expect((await download).suggestedFilename()).toBe('petty-tab-verdict.png');
});
