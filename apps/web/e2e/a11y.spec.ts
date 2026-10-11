import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const SCREENS = [
  'intro',
  'invite',
  'picker',
  'tab',
  'plea',
  'appeal',
  'waiting',
  'verdict',
  'verdict?view=tie',
];

async function open(page: Page, screen: string): Promise<void> {
  await page.goto(`/dev/screens/${screen}`);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const screen of SCREENS) {
    test(`${screen}: nothing animates`, async ({ page }) => {
      await open(page, screen);
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => (a as CSSAnimation).animationName),
      );
      expect(running).toEqual([]);
    });
  }

  test('the verdict opens on its final state', async ({ page }) => {
    await open(page, 'verdict');
    const card = page.getByRole('article');
    for (const text of ['GUILTY', 'Alex owes Maya', '7 days of morning coffee duty', 'The Blanket Burrito']) {
      await expect(card.getByText(text, { exact: false }).first()).toBeVisible();
    }
    const hidden = await card.evaluate(
      (el) => [...el.querySelectorAll('*')].filter((n) => getComputedStyle(n).opacity === '0').length,
    );
    expect(hidden).toBe(0);
  });
});

test.describe('keyboard', () => {
  for (const screen of SCREENS) {
    test(`${screen}: every control is reachable with a visible focus ring`, async ({ page }) => {
      await open(page, screen);
      await page.addStyleTag({ content: '* { transition: none !important; }' });
      if (screen === 'invite') await expect(page.getByRole('dialog')).toBeVisible();
      const controls = await page.evaluate(() => {
        // Behind an open modal sheet the page is inert; only the sheet counts.
        const root = document.querySelector('dialog[open]') ?? document.body;
        return [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]')]
          .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
          .map((el) => el.outerHTML.slice(0, 80));
      });
      const reached = new Set<string>();
      for (let i = 0; i < controls.length + 5; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const css = getComputedStyle(el);
          // The CSS asks for 2.5px (design.md §10); Chrome reports outline widths floored to whole pixels.
          let ring = `${css.outlineStyle} ${parseFloat(css.outlineWidth) >= 2} ${css.outlineColor}`;
          // The name input shows focus as its field's inset ring (prototype .field:focus-within).
          const field = el.closest('label');
          if (css.outlineStyle === 'none' && field) {
            const shadow = getComputedStyle(field).boxShadow;
            if (shadow.includes('rgb(233, 180, 64)') && shadow.includes('2.5px'))
              ring = 'solid true rgb(233, 180, 64)';
          }
          return { html: el.outerHTML.slice(0, 80), outline: ring };
        });
        if (!focused) continue;
        expect(focused.outline, focused.html).toBe('solid true rgb(233, 180, 64)');
        reached.add(focused.html);
      }
      for (const control of controls) expect(reached, control).toContain(control);
    });
  }

  test('the log sheet opens, traps focus and closes with Escape', async ({ page }) => {
    await open(page, 'tab');
    await page.getByRole('button', { name: 'Log a petty crime' }).focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'What did Alex do?' });
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      // Past the last control Chrome moves focus to its own UI (activeElement = body), never to the page behind.
      const inside = await page.evaluate(() => {
        const el = document.activeElement;
        return !el || el === document.body || !!el.closest('dialog');
      });
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});
