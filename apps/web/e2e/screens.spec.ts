import { expect, test, type Page } from '@playwright/test';
import { expectMatchesReference } from './compare';

// design.md §6: references are 390×844 at 2x. Idle loops are stopped (reduced motion) unless a test needs motion.
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });

async function open(page: Page, screen: string): Promise<void> {
  await page.goto(`/dev/screens/${screen}`);
  // Next's dev overlay (error / compile badge) is not part of the app.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
}

test('intro matches 01', async ({ page }) => {
  await open(page, 'intro');
  // Deliberate: no name chip and no "Invite your partner" button for a new visitor (design.md §6 Intro).
  await expectMatchesReference(page, '01-intro.png', { maxRatio: 0.05 });
});

test('invite sheet matches 02', async ({ page }) => {
  await open(page, 'invite');
  await expect(page.getByRole('dialog', { name: 'Invite your partner' })).toBeVisible();
  // Deliberate: the real /j/<token> link and no name chip behind the scrim.
  await expectMatchesReference(page, '02-invite-sheet.png', { maxRatio: 0.035 });
});

test.describe('picker', () => {
  test('top matches 03', async ({ page }) => {
    await open(page, 'picker');
    // The reference caught the bear mid-snore (an idle loop); reduced motion holds it at rest.
    await expectMatchesReference(page, '03-picker.png', { ignore: [{ x: 202, y: 199, w: 168, h: 120 }] });
  });

  test('scrolled matches 04', async ({ page }) => {
    await open(page, 'picker');
    await page.getByTestId('zoo').evaluate((el) => {
      el.style.scrollBehavior = 'auto';
      el.scrollTop = 470;
    });
    await expectMatchesReference(page, '04-picker-scrolled.png');
  });

  test('end matches 05', async ({ page }) => {
    await open(page, 'picker');
    await page.getByTestId('zoo').evaluate((el) => {
      el.style.scrollBehavior = 'auto';
      el.scrollTop = el.scrollHeight;
    });
    await expectMatchesReference(page, '05-picker-end.png');
  });

  test("the partner's animal cannot be picked", async ({ page }) => {
    await open(page, 'picker');
    await expect(page.getByRole('button', { name: /The Blanket Bear/ })).toBeDisabled();
    await page.getByRole('button', { name: /The Panic Rabbit/ }).click();
    await expect(page.getByRole('button', { name: 'Continue as Maya the Rabbit' })).toBeVisible();
  });
});

test.describe('the tab', () => {
  test('matches 06', async ({ page }) => {
    await open(page, 'tab');
    // The burrito row: the prototype marks it appealed but still shows its pill; here it is guilty (sad face).
    await expectMatchesReference(page, '06-tab.png');
  });

  test('log sheet matches 07', async ({ page }) => {
    await open(page, 'tab');
    await page.getByRole('button', { name: 'Log a petty crime' }).click();
    await expect(page.getByRole('dialog', { name: 'What did Alex do?' })).toBeVisible();
    await expectMatchesReference(page, '07-log-crime-sheet.png');
  });

  test('plea card matches 08 (layout: drawn from the accused side)', async ({ page }) => {
    await open(page, 'plea');
    await expect(page.getByText('Alex says you did this.')).toBeVisible();
    await expectMatchesReference(page, '08-plea-card.png');
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the GUILTY stamp matches 09 (layout: drawn from the accused side)', async ({ page }) => {
      await open(page, 'plea');
      await page.getByRole('button', { name: 'Guilty' }).click();
      await expect(page.getByText('Guilty', { exact: true })).toBeVisible();
      await page.waitForTimeout(800);
      // Freeze a deterministic frame: the slam 0.8 s in (stamp held, pill still hidden), idle loops at 0.
      await page.evaluate(() => {
        for (const a of document.getAnimations()) {
          const name = (a as CSSAnimation).animationName ?? '';
          a.pause();
          a.currentTime = /slamfade|pillwait/.test(name) ? 800 : 0;
        }
      });
      await expectMatchesReference(page, '09-plea-guilty-stamp.png');
    });
  });

  test('after the plea matches 10', async ({ page }) => {
    await open(page, 'plea');
    await page.getByRole('button', { name: 'Guilty' }).click();
    await expect(page.locator('[role=status]')).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
    await expectMatchesReference(page, '10-tab-after-plea.png');
  });

  test('Hebrew name matches 15', async ({ page }) => {
    await open(page, 'plea?me=מאיה&meSp=rabbit&themSp=sheep');
    await page.getByRole('button', { name: 'Guilty' }).click();
    await expect(page.locator('[role=status]')).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
    await expect(page.getByText('leads by 6')).toContainText('מאיה');
    await expectMatchesReference(page, '15-tab-hebrew-name.png');
  });

  test('filing a crime bumps the pill, shows the toast, and Undo takes it back', async ({ page }) => {
    await open(page, 'tab');
    await page.getByRole('button', { name: 'Log a petty crime' }).click();
    await page.getByRole('button', { name: /The Phantom Sip/ }).click();
    await expect(page.getByRole('status')).toContainText('Left a carton with three drops of milk');
    await expect(page.getByText('5 coffees')).toBeVisible();
    await expect(page.getByText('Maya leads by 6')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('4 coffees')).toBeVisible();
    await expect(page.getByText('Maya leads by 5')).toBeVisible();
  });

  test('the filer upholds an appeal', async ({ page }) => {
    await open(page, 'appeal');
    await expect(page.getByText('Alex appeals.')).toBeVisible();
    await page.getByRole('button', { name: 'Uphold' }).click();
    await expect(page.getByText('The Blanket Burrito, Alex, upheld')).toBeAttached();
    await test.info().attach('appeal card', { body: await page.screenshot(), contentType: 'image/png' });
  });

  test('waiting for the partner', async ({ page }) => {
    await open(page, 'waiting');
    await expect(page.getByText('Waiting for your partner')).toBeVisible();
    await expect(page.getByText('First verdict Sunday 20:00')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log a petty crime' })).toHaveCount(0);
    await test.info().attach('waiting', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
