import { expect, test } from '@playwright/test';
import { openInvite, path, person, pick } from './people';

// spec §4 end to end: the setup wizard. Maya sets the rules before the invite; Alex sees them and accepts.
const live = { timeout: 2000 };

test('Maya sets a 3-day sprint with her own chore for Alex; Alex reviews the rules and joins', async ({
  browser,
}, info) => {
  const a = await person(browser);
  await a.goto('/');
  await a.getByRole('button', { name: 'Start a tab' }).click();
  await expect(a.getByRole('img', { name: 'Step 1 of 3' })).toBeVisible();
  await pick(a, 'Maya', /Cat/);

  const setup = a.getByRole('main', { name: 'Set the rules' });
  await expect(setup.getByRole('img', { name: 'Step 2 of 3' })).toBeVisible();
  await setup.getByText('3-day sprint').click();
  await setup.getByRole('button', { name: /Car DJ Crimes/ }).click();
  await expect(setup.getByRole('button', { name: /Car DJ Crimes/ })).toHaveAttribute('aria-pressed', 'false');
  await setup.getByRole('button', { name: '+ Add your own crime or chore' }).click();
  const form = a.getByRole('dialog', { name: 'A crime of your own' });
  await form.getByLabel('What’s the crime?').fill('Dishes duty');
  await form.getByText('your partner’s').click();
  await form.getByRole('button', { name: 'Add it' }).click();
  await expect(setup.getByText("daily chore, your partner's")).toBeVisible();
  await info.attach('A: set the rules', {
    body: await a.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await setup.getByRole('button', { name: 'Create the tab' }).click();

  const sheet = a.getByRole('dialog', { name: 'Invite your partner' });
  await expect(sheet.getByText('Every 3 days at 20:00')).toBeVisible();
  await expect(sheet.getByText("Dishes duty, your partner's chore")).toBeVisible();
  await info.attach('A: the invite with the rules', { body: await a.screenshot(), contentType: 'image/png' });
  const link = `https://${await sheet.getByText('/j/').textContent()}`;
  await sheet.getByRole('button', { name: 'Open our tab' }).click();

  const b = await person(browser);
  await b.goto(path(link));
  await expect(b.getByRole('heading', { name: 'Maya’s rules' })).toBeVisible();
  await expect(b.getByText('Every 3 days at 20:00')).toBeVisible();
  await expect(b.getByText('Dishes duty, your chore')).toBeVisible();
  await expect(b.getByText(/10 crimes in play/)).toBeVisible(); // 9 catalog crimes left plus Dishes duty
  await info.attach('B: the rules before joining', { body: await b.screenshot(), contentType: 'image/png' });
  await openInvite(b, link);
  await pick(b, 'Alex', /Bear/);

  for (const p of [a, b]) await expect(p.getByText('Dead even')).toBeVisible(live);
  await expect(b.getByRole('button', { name: /Dishes duty/ })).toHaveAttribute('aria-pressed', 'false');
  await a.getByRole('button', { name: 'Log a petty crime' }).click();
  await expect(a.getByRole('dialog').getByRole('button', { name: /Car DJ Crimes/ })).toHaveCount(0);
});
