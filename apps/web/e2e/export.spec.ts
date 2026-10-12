import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { openRender, renderCard, renderReel } from '@petty-tab/renderer';
import type { RenderInput } from '@petty-tab/shared';

// apps/renderer's own functions against this e2e web server (needs ffmpeg and ffprobe on the PATH).
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

test('the card PNG is exactly 1080×1920', async ({ browser, baseURL }) => {
  const page = await openRender(browser, baseURL!, 'card', MAYA_WINS);
  const png = await renderCard(page);
  // PNG IHDR: width and height are the big-endian words at bytes 16 and 20.
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1920]);
});

test('the reel MP4 matches reel.md §8, and two renders give identical frames', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(300_000);
  const dir = mkdtempSync(join(tmpdir(), 'reel-'));
  const renders: string[][] = [];
  for (const name of ['a.mp4', 'b.mp4']) {
    const page = await openRender(browser, baseURL!, 'reel', MAYA_WINS);
    renders.push(await renderReel(page, join(dir, name)));
    await page.close();
  }
  expect(renders[0]).toHaveLength(180);
  expect(renders[1]).toEqual(renders[0]);

  const probe = JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', join(dir, 'a.mp4')],
      {
        encoding: 'utf8',
      },
    ),
  ) as { streams: Record<string, string | number>[]; format: { duration: string } };
  const video = probe.streams.find((s) => s.codec_type === 'video')!;
  const audio = probe.streams.find((s) => s.codec_type === 'audio')!;
  expect(video).toMatchObject({
    codec_name: 'h264',
    profile: 'High',
    pix_fmt: 'yuv420p',
    width: 1080,
    height: 1920,
  });
  expect(video.r_frame_rate).toBe('30/1');
  expect(audio).toMatchObject({ codec_name: 'aac', sample_rate: '48000', channels: 2 });
  expect(Math.abs(Number(probe.format.duration) - 6)).toBeLessThanOrEqual(1 / 30);
});
