import { expect, test, type Locator } from '@playwright/test';
import { ORDER } from '@petty-tab/art';
import { diffImages } from './compare';

const previewUrl = new URL('../../../packages/art/preview.html', import.meta.url).href;

/**
 * Screenshot a drawing pinned to the viewport origin, so both pages rasterise it on the same pixel grid.
 * The gallery frame's rounded corner is dropped: it shows each page's own background, not the art.
 */
async function shot(el: Locator): Promise<Buffer> {
  await el.evaluate((node: HTMLElement) => {
    Object.assign(node.style, { position: 'fixed', top: '0', left: '0', zIndex: '1', borderRadius: '0' });
  });
  return el.screenshot();
}

test('/dev/art draws the nine portraits like preview.html', async ({ page, browser }) => {
  const preview = await browser.newPage({ reducedMotion: 'reduce' });
  await preview.goto(previewUrl);
  // preview.html loads Rubik 400/600/800 only, so the art's 700-weight text (the cat's "4/10") gets a synthetic
  // weight there. The app loads a real 700; give the preview the same face so the comparison is fair.
  await preview.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@700&display=block' });
  await preview.evaluate(() => document.fonts.load('700 12px Rubik'));
  const previewPortraits = preview.locator('h2:text("Signature portraits") + .row figure > div');
  await expect(previewPortraits).toHaveCount(9);

  await page.goto('/dev/art');
  await page.evaluate(() => document.fonts.ready);

  for (const [i, sp] of ORDER.entries()) {
    const expected = await shot(previewPortraits.nth(i));
    const actual = await shot(page.getByTestId(`portrait-${sp}`));
    await test.info().attach(`${sp}-preview.png`, { body: expected, contentType: 'image/png' });
    await test.info().attach(`${sp}-dev-art.png`, { body: actual, contentType: 'image/png' });
    // 1% allows for anti-aliasing between Google's Rubik file and next/font's copy (only the cat has text).
    expect((await diffImages(page, expected, actual, { tolerance: 8 })).ratio, sp).toBeLessThan(0.01);
  }
  await preview.close();
});
