import { expect, test } from '@playwright/test';
import { pair } from './people';

// spec §6 and §8 end to end: a pair's own crimes and daily chores. "Live" means within 2 seconds.
const live = { timeout: 2000 };

test('Maya adds her own crime, files it, and Alex owns it', async ({ browser }, info) => {
  const { a, b } = await pair(browser);
  await a.getByRole('button', { name: 'Log a petty crime' }).click();
  await a.getByRole('button', { name: '+ New crime or chore' }).click();
  const form = a.getByRole('dialog', { name: 'A crime of your own' });
  await form.getByLabel('What’s the crime?').fill('Toilet paper roulette');
  await form.getByLabel('In one line').fill('One lonely square, every time.');
  await form.getByText('+1 dish load').click();
  await form.getByLabel('roll').check({ force: true });
  await info.attach('A: the new crime form', { body: await a.screenshot(), contentType: 'image/png' });
  await form.getByRole('button', { name: 'Add it' }).click();
  await expect(a.getByText('Toilet paper roulette is on the list.')).toBeVisible();

  await a.getByRole('button', { name: 'Log a petty crime' }).click();
  await a.getByRole('dialog').getByRole('button', { name: /Toilet paper roulette/ }).click();
  await expect(b.getByText('Maya says you did this.')).toBeVisible(live);
  await expect(b.getByText('Toilet paper roulette', { exact: false }).first()).toBeVisible();
  await b.getByRole('button', { name: 'Fine, I did it' }).click();

  await a.getByRole('button', { name: /Who owes what/ }).click();
  await expect(a.getByRole('dialog', { name: 'Who owes what' }).getByText('1 dish load')).toBeVisible(live);
});

test('Alex ticks his daily chore and Maya sees it live; removing it takes it off the tab', async ({
  browser,
}) => {
  const { a, b } = await pair(browser);
  const created = await a.request.post('/api/crimes', {
    data: { title: 'Dishes duty', description: '', unit: 'dish', sticker: 'dish', chore: 'them' },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };

  const mine = b.getByRole('button', { name: /Dishes duty/ });
  await expect(mine).toHaveAttribute('aria-pressed', 'false', live);
  await expect(a.getByText('Not yet')).toBeVisible(live);
  await mine.click();
  await expect(mine).toHaveAttribute('aria-pressed', 'true', live);
  await expect(a.getByText('Done today')).toBeVisible(live);
  // Only the owner ticks it.
  expect((await a.request.post(`/api/chores/${id}/done`)).status()).toBe(403);

  await a.getByRole('button', { name: 'Log a petty crime' }).click();
  await a.getByRole('button', { name: 'Edit your list' }).click();
  await a.getByRole('button', { name: 'Remove' }).click();
  await expect(b.getByRole('list', { name: "Today's chores" })).toBeHidden(live);
});
