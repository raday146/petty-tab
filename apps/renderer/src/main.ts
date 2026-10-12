import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PgBoss } from 'pg-boss';
import { chromium } from 'playwright';
import { RENDER_QUEUES, type RenderedJob, type RenderJob } from '@petty-tab/shared';
import { openRender, renderCard, renderReel } from './render.ts';

/** spec §11: renders cards and reels from the `render` queue into STORAGE_DIR, then reports on `rendered`. */
const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
// Same default as apps/api (files.controller.ts): the repo's storage/ folder.
const storage = resolve(process.env.STORAGE_DIR ?? '../../storage');

const boss = new PgBoss(process.env.DATABASE_URL!);
boss.on('error', (e) => console.error(e));
await boss.start();
for (const name of Object.values(RENDER_QUEUES)) await boss.createQueue(name);
const browser = await chromium.launch();

// ponytail: one render at a time per process; run more renderer processes if the queue backs up.
await boss.work<RenderJob>(RENDER_QUEUES.render, async ([job]) => {
  const { verdictId, kind, key, input } = job!.data;
  const file = resolve(storage, key);
  // Written next to the target, then renamed, so the API never serves half a file.
  const part = `${file}.part.${kind === 'card' ? 'png' : 'mp4'}`;
  await mkdir(dirname(file), { recursive: true });
  const started = Date.now();
  const page = await openRender(browser, webUrl, kind, input);
  try {
    if (kind === 'card') await writeFile(part, await renderCard(page));
    else await renderReel(page, part);
  } finally {
    await page.close();
  }
  await rename(part, file);
  await boss.send(RENDER_QUEUES.rendered, { verdictId, kind, key } satisfies RenderedJob);
  console.log(`rendered ${key} in ${Date.now() - started} ms`);
});

console.log(`renderer: ${webUrl} → ${storage}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => void Promise.all([boss.stop(), browser.close()]).then(() => process.exit(0)));
