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

// Deliberate (owner, 2026-10-14, phone test): the scoreboard lost its owed row (now the tally sheet), the button
// is a footer under the list, and the card copy changed. Below the score card's top row the references no
// longer apply, so the tab screens compare the header and the duel only; the rest is checked by assertions.
const BELOW_DUEL = { x: 0, y: 280, w: 390, h: 600 };

test.describe('the tab', () => {
  test('matches 06', async ({ page }) => {
    await open(page, 'tab');
    // The burrito row: the prototype marks it appealed but still shows its pill; here it is guilty (sad face).
    await expectMatchesReference(page, '06-tab.png', { ignore: [BELOW_DUEL] });
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
    await expectMatchesReference(page, '08-plea-card.png', { ignore: [BELOW_DUEL] });
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the GUILTY stamp matches 09 (layout: drawn from the accused side)', async ({ page }) => {
      await open(page, 'plea');
      await page.getByRole('button', { name: 'Fine, I did it' }).click();
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
      await expectMatchesReference(page, '09-plea-guilty-stamp.png', { ignore: [BELOW_DUEL] });
    });
  });

  test('after the plea matches 10', async ({ page }) => {
    await open(page, 'plea');
    await page.getByRole('button', { name: 'Fine, I did it' }).click();
    await expect(page.locator('[role=status]')).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
    await expectMatchesReference(page, '10-tab-after-plea.png', { ignore: [BELOW_DUEL] });
  });

  test('Hebrew name matches 15', async ({ page }) => {
    await open(page, 'plea?me=מאיה&meSp=rabbit&themSp=sheep');
    await page.getByRole('button', { name: 'Fine, I did it' }).click();
    await expect(page.locator('[role=status]')).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });
    await expect(page.getByText('leads by 6')).toContainText('מאיה');
    await expectMatchesReference(page, '15-tab-hebrew-name.png', { ignore: [BELOW_DUEL] });
  });

  test('filing a crime moves the score, shows the toast, and Undo takes it back', async ({ page }) => {
    await open(page, 'tab');
    await page.getByRole('button', { name: 'Log a petty crime' }).click();
    await page.getByRole('button', { name: /The Phantom Sip/ }).click();
    await expect(page.getByRole('status')).toContainText('Left a carton with three drops of milk');
    await expect(page.getByText('Maya leads by 6')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Maya leads by 5')).toBeVisible();
    await page.getByRole('button', { name: /Who owes what/ }).click();
    await expect(page.getByRole('dialog', { name: 'Who owes what' }).getByText('4 coffees')).toBeVisible();
  });

  test('the filer says nice try to a cried foul', async ({ page }) => {
    await open(page, 'appeal');
    await expect(page.getByText('Alex cries foul.')).toBeVisible();
    await page.getByRole('button', { name: 'Nice try' }).click();
    await expect(page.getByText('The Blanket Burrito, Alex, counts')).toBeAttached();
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

test.describe('the verdict', () => {
  test('winner card matches 12', async ({ page }) => {
    await open(page, 'verdict');
    await expectMatchesReference(page, '12-verdict-card.png');
  });

  test('sentence sheet matches 13', async ({ page }) => {
    await open(page, 'verdict');
    await page.getByRole('button', { name: 'Change the sentence', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Pick the sentence' })).toBeVisible();
    await expectMatchesReference(page, '13-sentence-sheet.png');
  });

  test('Hebrew name matches 16', async ({ page }) => {
    await open(page, 'verdict?me=מאיה&meSp=rabbit&themSp=sheep');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('מאיה vs. Alex');
    // The reference caught confetti mid-fall; reduced motion has none.
    await expectMatchesReference(page, '16-verdict-hebrew-name.png', { maxRatio: 0.03 });
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('mid-sequence matches 11', async ({ page }) => {
      await open(page, 'verdict');
      // 2.3 s in: the stamp has slammed, the heap is down, the crown and sentence are not there yet.
      await page.evaluate(() => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = 2300;
        }
      });
      await expectMatchesReference(page, '11-verdict-mid-sequence.png');
    });
  });

  test('picking a sentence changes it and the winner sharing locks it', async ({ page }) => {
    await open(page, 'verdict');
    await page.getByRole('button', { name: 'Change the sentence', exact: true }).click();
    await page.getByRole('button', { name: 'Breakfast in bed' }).click();
    await expect(page.getByRole('button', { name: /^Breakfast in bed\. Change the sentence/ })).toBeVisible();
    await page.getByRole('button', { name: 'Share story' }).click();
    await expect(page.getByRole('button', { name: 'Change the sentence', exact: true })).toHaveCount(0);
    await expect(page.getByRole('article').getByText('Breakfast in bed', { exact: true })).toBeVisible();
  });

  test('served and confirmed', async ({ page }) => {
    await open(page, 'verdict?view=loser');
    await expect(page.getByRole('button', { name: 'Change the sentence', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'I served it' }).click();
    await expect(page.getByRole('button', { name: 'Waiting for Maya' })).toBeDisabled();
    await test
      .info()
      .attach('loser', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    await open(page, 'verdict?view=served');
    await page.getByRole('button', { name: "Confirm it's served" }).click();
    await expect(page.getByText('Served and confirmed.')).toBeVisible();
  });

  for (const view of ['locked', 'tie']) {
    test(`${view} variant`, async ({ page }) => {
      await open(page, `verdict?view=${view}`);
      await expect(page.getByRole('button', { name: 'Change the sentence', exact: true })).toHaveCount(0);
      if (view === 'tie') {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dead even');
        await expect(page.getByText('No one owes anyone. Suspicious.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Share story' })).toHaveCount(0);
      }
      await test.info().attach(view, { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
});

test.describe('the story preview', () => {
  // The art's loops (spirals, orbiting stars) are part of the reel, driven from t.
  test.use({ reducedMotion: 'no-preference' });

  test('matches 14 at t = 5.5', async ({ page }) => {
    // The middle bar in the reference is 92% full: t = 5.5 of 6.
    await open(page, 'story?t=5.5');
    await expect(page.getByText('@alex')).toBeVisible();
    await expect(page.getByText('maya.thecat')).toBeVisible();
    // The reference caught its confetti at another moment of the burst (about 2.5% of pixels); the frame, the
    // stage and the text line up.
    await expectMatchesReference(page, '14-story-viewer.png', { maxRatio: 0.04 });
  });
});
