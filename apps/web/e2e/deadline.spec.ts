import { expect, test } from '@playwright/test';
import { pair } from './people';

// spec §10 end to end: settle now and moving the deadline need both people. "Live" means within 2 seconds.
const live = { timeout: 2000 };

test('Maya asks to settle now, Alex agrees, and both phones open the verdict', async ({ browser }, info) => {
  const { a, b } = await pair(browser);
  await a.request.post('/api/charges', { data: { crimeKey: 'trash' } });
  await a.getByRole('button', { name: /^First verdict Sunday/ }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Settle now' }).click();
  await expect(a.getByText('You want to settle now. Waiting for Alex…')).toBeVisible();

  const card = b.getByRole('group', { name: 'Settle now?' });
  await expect(
    card.getByText('Maya wants to settle the tab right now! Ready to face the verdict?'),
  ).toBeVisible(live);
  await info.attach('B: the settle-now card', { body: await b.screenshot(), contentType: 'image/png' });
  await card.getByRole('button', { name: 'Settle now' }).click();

  for (const p of [a, b])
    await expect(p.getByRole('heading', { level: 1 })).toHaveText('Maya vs. Alex', live);
});

test('Maya moves the deadline, Alex says deal, the chip follows; a nope changes nothing', async ({
  browser,
}) => {
  const { a, b } = await pair(browser);
  const friday = new Date();
  friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7 || 7));
  friday.setHours(21, 0, 0, 0);
  // Through the API so the test does not depend on today's weekday; the sheet's buttons call the same route.
  await a.request.post('/api/deadline/proposal', { data: { end: friday.toISOString() } });

  const card = b.getByRole('group', { name: 'Move the deadline?' });
  await expect(card.getByText(/^Maya is moving the goalposts! Verdict Fri 21:00 instead of/)).toBeVisible(
    live,
  );
  await card.getByRole('button', { name: 'Nope' }).click();
  await expect(a.getByRole('group', { name: 'Move the deadline?' })).toBeHidden(live);

  await a.request.post('/api/deadline/proposal', { data: { end: friday.toISOString() } });
  await b
    .getByRole('group', { name: 'Move the deadline?' })
    .getByRole('button', { name: 'Deal' })
    .click(live);
  await expect(a.getByRole('button', { name: 'First verdict Friday 21:00' })).toBeVisible(live);
});
