import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { RenderInput } from '@petty-tab/shared';
import { diffImages, type Rect } from './compare';

// The verdict every reference frame was drawn from (reel.md §1).
const MAYA_WINS: RenderInput = {
  winner: { name: 'Maya', species: 'cat' },
  loser: { name: 'Alex', species: 'bear' },
  tie: false,
  topCrimes: [
    { crime: 'burrito', count: 2 },
    { crime: 'dish', count: 1 },
    { crime: 'trash', count: 1 },
  ],
  sentence: 'coffee7',
};

const FRAMES = new URL('../../../reference/reel-frames/', import.meta.url);
// The reference frames were captured from the prototype's rounded story viewer: black corners and a 1px
// anti-aliased side edge that the export does not have (recorded in plan.md, M5).
const VIEWER_EDGES: Rect[] = [
  { x: 0, y: 0, w: 40, h: 40 },
  { x: 1040, y: 0, w: 40, h: 40 },
  { x: 0, y: 1880, w: 40, h: 40 },
  { x: 1040, y: 1880, w: 40, h: 40 },
  { x: 0, y: 0, w: 2, h: 1920 },
  { x: 1078, y: 0, w: 2, h: 1920 },
];

// reel.md §10 suggests about 2%. The references are softer than a crisp 1080 render (every edge is anti-aliased
// a pixel wider; best alignment is 0,0), which costs up to 2.6% on the busiest frames: 3% (plan.md, M5).
const MAX_RATIO = 0.03;

// The export renders at 1080×1920, device scale 1, with the art's loops on (driven from t, reel.md §5).
test.use({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, contextOptions: {} });

async function open(page: Page, kind: 'card' | 'reel', input: RenderInput): Promise<void> {
  await page.goto(`/render/${kind}`);
  await page.waitForFunction(() => !!window.__render);
  await page.evaluate((i) => window.__render!(i), input);
}

async function keep(name: string, actual: Buffer, image: Buffer, ratio: number): Promise<void> {
  const dir = process.env.DIFF_DIR;
  await test.info().attach(`${name} diff`, { body: image, contentType: 'image/png' });
  if (!dir) return;
  console.log(`${name}: ${(ratio * 100).toFixed(2)}%`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${name}-actual.png`, actual);
  writeFileSync(`${dir}/${name}-diff.png`, image);
}

test.describe('reel frames (reel.md §10 golden frames)', () => {
  for (const file of readdirSync(FRAMES).filter((f) => f.endsWith('.png'))) {
    const t = Number(file.slice(1, -4));
    test(`t = ${t.toFixed(2)} matches ${file}`, async ({ page }) => {
      await open(page, 'reel', MAYA_WINS);
      await page.evaluate((t) => window.__reel!.seek(t), t);
      const actual = await page.screenshot();
      const { ratio, image } = await diffImages(page, readFileSync(new URL(file, FRAMES)), actual, {
        ignore: VIEWER_EDGES,
      });
      await keep(`reel-${file.slice(0, -4)}`, actual, image, ratio);
      expect(ratio, `${file} differs by ${(ratio * 100).toFixed(2)}%`).toBeLessThan(MAX_RATIO);
    });
  }

  test('the same t twice is the same frame', async ({ page }) => {
    await open(page, 'reel', MAYA_WINS);
    const shots: Buffer[] = [];
    for (const t of [3.95, 1.2, 3.95]) {
      await page.evaluate((t) => window.__reel!.seek(t), t);
      shots.push(await page.screenshot());
    }
    expect(shots[2]!.equals(shots[0]!)).toBe(true);
  });
});

test.describe('verdict card (spec §11)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('is exactly 1080×1920 and matches the verdict card of 12-verdict-card.png', async ({ page }) => {
    // Reference 12's top crimes (verdict.spec.ts): Blanket Burrito ×2, Snooze Roulette, Dishwasher Terrorism.
    await open(page, 'card', {
      ...MAYA_WINS,
      topCrimes: [
        { crime: 'burrito', count: 2 },
        { crime: 'clock', count: 1 },
        { crime: 'dish', count: 1 },
      ],
    });
    const png = await page.screenshot();
    // The reference is a 390×844 phone at 2×; its card is the 390×693 box under the 54px status bar.
    const { width, height, shrunk } = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = new OffscreenCanvas(780, 1688);
      c.getContext('2d')!.drawImage(img, 0, 108, 780, 1386.67);
      const bytes = new Uint8Array(await (await c.convertToBlob()).arrayBuffer());
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return { width: img.width, height: img.height, shrunk: btoa(bin) };
    }, png.toString('base64'));
    expect([width, height]).toEqual([1080, 1920]);
    const reference = readFileSync(
      new URL('../../../reference/screens/12-verdict-card.png', import.meta.url),
    );
    const { ratio, image } = await diffImages(page, reference, Buffer.from(shrunk, 'base64'), {
      scale: 2,
      clip: { x: 0, y: 54, w: 390, h: 693 },
      // The screen's back, dice and replay buttons sit over the card; they are never exported.
      ignore: [
        { x: 10, y: 60, w: 46, h: 46 },
        { x: 285, y: 60, w: 100, h: 46 },
      ],
    });
    await keep('card', png, image, ratio);
    // Shrinking 1080 → 780 resamples every edge (2.7%); the reference's sparkles are mid-twinkle (0.1%).
    expect(ratio, `card differs by ${(ratio * 100).toFixed(2)}%`).toBeLessThan(MAX_RATIO);
  });
});
