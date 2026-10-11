import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** A rectangle in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Diff {
  /** Share of compared pixels that differ. */
  ratio: number;
  /** PNG: the expected image faded, differing pixels in red, ignored areas blanked. */
  image: Buffer;
}

/**
 * Pixel diff of two same-size PNGs, measured in the browser (no extra dependencies). A pixel differs when any
 * channel is more than `tolerance`/255 apart (default 32, about 12%: glyph-edge anti-aliasing passes, a shifted
 * or recoloured edge does not). `clip` limits the comparison; `ignore` rects are skipped.
 */
export async function diffImages(
  page: Page,
  expected: Buffer,
  actual: Buffer,
  {
    scale = 1,
    clip,
    ignore = [],
    tolerance = 32,
  }: { scale?: number; clip?: Rect; ignore?: Rect[]; tolerance?: number } = {},
): Promise<Diff> {
  const { ratio, dataUrl } = await page.evaluate(
    async ({ a64, b64, scale, clip, ignore, tolerance }) => {
      const load = async (b64: string): Promise<ImageData> => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
      };
      const [x, y] = await Promise.all([load(a64), load(b64)]);
      if (x.width !== y.width || x.height !== y.height) return { ratio: 1, dataUrl: '' };
      const { width, height } = x;
      const area = clip ?? { x: 0, y: 0, w: width / scale, h: height / scale };
      const inside = (px: number, py: number, r: { x: number; y: number; w: number; h: number }): boolean =>
        px >= r.x * scale && px < (r.x + r.w) * scale && py >= r.y * scale && py < (r.y + r.h) * scale;
      const out = new ImageData(width, height);
      let compared = 0;
      let diff = 0;
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const i = (py * width + px) * 4;
          if (!inside(px, py, area) || ignore.some((r) => inside(px, py, r))) continue;
          compared++;
          const differs = [0, 1, 2, 3].some((c) => Math.abs(x.data[i + c]! - y.data[i + c]!) > tolerance);
          if (differs) diff++;
          const grey = 255 - (255 - (x.data[i]! + x.data[i + 1]! + x.data[i + 2]!) / 3) * 0.25;
          out.data.set(differs ? [230, 30, 30, 255] : [grey, grey, grey, 255], i);
        }
      }
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext('2d')!.putImageData(out, 0, 0);
      const blob = await canvas.convertToBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return { ratio: diff / compared, dataUrl: btoa(bin) };
    },
    { a64: expected.toString('base64'), b64: actual.toString('base64'), scale, clip, ignore, tolerance },
  );
  return { ratio, image: Buffer.from(dataUrl, 'base64') };
}

/**
 * The phone area every reference shares (design.md §6, "How to compare"): drop the fake status bar (top 54) and
 * home indicator (bottom 21), and the bezel showing through the screen's rounded bottom corners (radius 48).
 */
const PHONE_CLIP: Rect = { x: 0, y: 54, w: 390, h: 769 };
const BEZEL_CORNERS: Rect[] = [
  { x: 0, y: 796, w: 48, h: 48 },
  { x: 342, y: 796, w: 48, h: 48 },
];

/** Screenshot the page and compare it with `reference/screens/<file>`; diff ratio and images go into the report. */
export async function expectMatchesReference(
  page: Page,
  file: string,
  { maxRatio = 0.02, ignore = [] }: { maxRatio?: number; ignore?: Rect[] } = {},
): Promise<number> {
  const expected = readFileSync(new URL(`../../../reference/screens/${file}`, import.meta.url));
  const actual = await page.screenshot();
  const { ratio, image } = await diffImages(page, expected, actual, {
    scale: 2,
    clip: PHONE_CLIP,
    ignore: [...BEZEL_CORNERS, ...ignore],
  });
  const info = test.info();
  info.annotations.push({ type: 'diff', description: `${file}: ${(ratio * 100).toFixed(2)}%` });
  await info.attach(`${file} actual`, { body: actual, contentType: 'image/png' });
  await info.attach(`${file} diff`, { body: image, contentType: 'image/png' });
  // Local debugging: DIFF_DIR=/some/dir pnpm e2e writes the screenshot and the diff there.
  const dir = process.env.DIFF_DIR;
  if (dir) {
    console.log(`${file}: ${(ratio * 100).toFixed(2)}%`);
    writeFileSync(`${dir}/${file.replace('.png', '')}-actual.png`, actual);
    writeFileSync(`${dir}/${file.replace('.png', '')}-diff.png`, image);
  }
  expect(ratio, `${file} differs by ${(ratio * 100).toFixed(2)}%`).toBeLessThan(maxRatio);
  return ratio;
}
