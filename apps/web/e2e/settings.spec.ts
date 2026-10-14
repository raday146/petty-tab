import { expect, test } from '@playwright/test';
import { openInvite, pair, person, pick, startTab } from './people';

// plan.md M6: the one-time notifications offer (spec §12) and the sound setting (design.md §8).
// plan.md M7: delete everything (spec §4.8).

test('the notifications offer comes once the pair completes, and only once', async ({ browser }) => {
  const a = await person(browser, { asked: false });
  // Headless Chromium reports notifications as denied whatever is granted; a phone starts at "default",
  // the state in which the offer comes.
  await a
    .context()
    .addInitScript(() => Object.defineProperty(Notification, 'permission', { get: () => 'default' }));
  const link = await startTab(a, 'Maya', /Cat/);
  const offer = a.getByRole('dialog', { name: "Know when you're charged" });
  await expect(offer).toBeHidden();

  const b = await person(browser);
  await openInvite(b, link);
  await pick(b, 'Alex', /Bear/);
  await expect(offer).toBeVisible({ timeout: 2000 });
  await expect(offer).toContainText('A ping when Alex logs a crime or cries foul');
  await offer.getByRole('button', { name: 'Not now' }).click();
  await expect(offer).toBeHidden();

  await a.reload();
  await expect(a.getByText('Dead even')).toBeVisible();
  await expect(offer).toBeHidden();
});

test('sound and notifications live on the edit screen; sound is remembered', async ({ browser }) => {
  const a = await person(browser);
  await startTab(a, 'Maya', /Cat/);
  await a.getByRole('button', { name: 'Change your name or animal' }).click();
  const sound = a.getByRole('button', { name: /^Sound:/ });
  await expect(sound).toHaveText('Sound: on');
  await expect(a.getByRole('button', { name: /^Notifications:/ })).toBeVisible();

  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await a.reload();
  await a.getByRole('button', { name: 'Change your name or animal' }).click();
  await expect(sound).toHaveText('Sound: off');
  expect(await a.evaluate(() => localStorage.getItem('pt-sound'))).toBe('off');
});

test('delete everything ends the tab for both and starts this phone over', async ({ browser }) => {
  const { a, b } = await pair(browser);
  const cookie = async () => (await a.context().cookies()).find((c) => c.name === 'pt_session')?.value;
  const before = await cookie();
  await a.getByRole('button', { name: 'Change your name or animal' }).click();
  await a.getByRole('button', { name: 'Delete everything' }).click();
  await expect(a.getByText('Alex’s tab ends too.')).toBeVisible();
  await a.getByRole('button', { name: 'Delete everything' }).click();
  await expect(a.getByRole('button', { name: 'Start a tab' })).toBeVisible();
  expect(await cookie()).not.toBe(before);
  await b.reload();
  await expect(b.getByRole('button', { name: 'Start a tab' })).toBeVisible();
});
