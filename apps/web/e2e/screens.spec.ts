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
