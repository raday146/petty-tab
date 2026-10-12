import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';
import type { RenderInput, RenderKind } from '@petty-tab/shared';

/** reel.md §8: 1080×1920, 30 fps, 6.00 s. */
const FPS = 30;
const FRAMES = 6 * FPS;

/** A fresh 1080×1920 page on a render route with `input` drawn. The card sits on its final state. */
export async function openRender(
  browser: Browser,
  webUrl: string,
  kind: RenderKind,
  input: RenderInput,
): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    reducedMotion: kind === 'card' ? 'reduce' : 'no-preference',
  });
  await page.goto(`${webUrl}/render/${kind}`);
  await page.waitForFunction(() => !!window.__render);
  await page.evaluate((i) => window.__render!(i), input);
  return page;
}

/** The card PNG. */
export const renderCard = (page: Page): Promise<Buffer> => page.screenshot({ type: 'png' });

/**
 * The reel MP4 at `out`: 180 frames, each seek(t) → painted → screenshot, piped to ffmpeg with the offline
 * soundtrack. Returns each frame's sha256 so tests can check two renders are identical.
 */
export async function renderReel(page: Page, out: string): Promise<string[]> {
  const wav = join(tmpdir(), `reel-${process.pid}-${Date.now()}.wav`);
  await writeFile(wav, Buffer.from(await page.evaluate(() => window.__reel!.wav()), 'base64'));
  // prettier-ignore
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k',
    '-t', '6', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = once(ffmpeg, 'close');
  const hashes: string[] = [];
  try {
    for (let i = 0; i < FRAMES; i++) {
      // Two animation frames after seek: a layer that just became visible is painted before the screenshot.
      await page.evaluate(
        (t) =>
          new Promise<void>((done) => {
            window.__reel!.seek(t);
            requestAnimationFrame(() => requestAnimationFrame(() => done()));
          }),
        i / FPS,
      );
      const png = await page.screenshot({ type: 'png' });
      hashes.push(createHash('sha256').update(png).digest('hex'));
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
    }
    ffmpeg.stdin.end();
    const [code] = await done;
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  } finally {
    ffmpeg.stdin.destroy();
    await rm(wav, { force: true });
  }
  return hashes;
}
