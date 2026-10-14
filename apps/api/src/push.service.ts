import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import webpush, { type PushSubscription } from 'web-push';
import { chargePushText, PUSH_BATCH_MS, UNDO_MS, type pushSubscriptionBody } from '@petty-tab/shared';
import type { z } from 'zod';
import { Clock } from './clock.js';
import { Jobs, QUEUES } from './jobs.js';
import { loadBook } from './book.js';
import { PrismaService } from './prisma.service.js';

/** One push to every device of a member's user. */
export type PushJob = { memberId: string; body: string };
/** A charge's held push (spec §8), or a batch waiting out the 2-minute window (spec §12). */
export type ChargePushJob = { chargeId: string } | { accusedId: string };

const log = new Logger('Push');
const vapid = process.env.VAPID_PRIVATE_KEY
  ? {
      subject: process.env.VAPID_SUBJECT ?? 'mailto:dev@petty-tab.invalid',
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    }
  : undefined;

/** spec §12: Web Push with VAPID, sent from pg-boss jobs. */
@Injectable()
export class PushService implements OnModuleInit {
  /** Delivers one payload; tests swap it. Without VAPID keys the push is only logged. */
  send = async (sub: PushSubscription, payload: string): Promise<void> => {
    if (!vapid) return void log.log(`(no VAPID keys) ${payload}`);
    await webpush.sendNotification(sub, payload, { vapidDetails: vapid, TTL: 24 * 60 * 60 });
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.start();
    await this.jobs.boss.work<PushJob>(QUEUES.push, ([job]) => this.deliver(job!.data));
    await this.jobs.boss.work<ChargePushJob>(QUEUES.chargePush, ([job]) => this.chargePush(job!.data));
  }

  async subscribe(userId: string, body: z.output<typeof pushSubscriptionBody>): Promise<void> {
    const data = { userId, endpoint: body.endpoint, keys: body.keys };
    await this.prisma.pushSub.upsert({ where: { endpoint: body.endpoint }, create: data, update: data });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSub.deleteMany({ where: { userId, endpoint } });
  }

  /** Queue one push to a member (spec §12: one per event; the callers send it once). */
  async notify(memberId: string, body: string): Promise<void> {
    await this.jobs.boss.send(QUEUES.push, { memberId, body } satisfies PushJob);
  }

  /** Sends to every subscription of the member's user; gone subscriptions (404/410) are deleted. */
  async deliver({ memberId, body }: PushJob): Promise<void> {
    const subs = await this.prisma.pushSub.findMany({
      where: { user: { members: { some: { id: memberId } } } },
    });
    const payload = JSON.stringify({ title: 'Petty Tab', body, url: '/' });
    for (const sub of subs) {
      try {
        await this.send({ endpoint: sub.endpoint, keys: sub.keys as PushSubscription['keys'] }, payload);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await this.prisma.pushSub.deleteMany({ where: { id: sub.id } });
        else log.warn(`push to ${new URL(sub.endpoint).host} failed: ${status ?? String(e)}`);
      }
    }
  }

  /**
   * spec §8, §12: runs once a charge's undo window has passed. Within 2 minutes of the accused's last charge
   * push it waits for the window to end; then one push carries every unpushed charge still pending.
   */
  async chargePush(job: ChargePushJob): Promise<void> {
    let accusedId: string;
    if ('chargeId' in job) {
      const charge = await this.prisma.charge.findUnique({ where: { id: job.chargeId } });
      if (!charge || charge.pushedAt) return;
      accusedId = charge.accusedId;
    } else accusedId = job.accusedId;

    const now = this.clock.now();
    const last = await this.prisma.charge.aggregate({ where: { accusedId }, _max: { pushedAt: true } });
    const lastAt = last._max.pushedAt?.getTime();
    if (lastAt !== undefined && now.getTime() - lastAt < PUSH_BATCH_MS) {
      const startAfter = new Date(lastAt + PUSH_BATCH_MS);
      await this.jobs.boss.send(QUEUES.chargePush, { accusedId } satisfies ChargePushJob, { startAfter });
      return;
    }
    // Atomic claim: of two jobs running at once, only one gets the charges.
    const claimed = await this.prisma.$queryRaw<{ crimeKey: string; filerId: string; pairId: string }[]>`
      WITH c AS (
        UPDATE charges SET pushed_at = ${now}
        WHERE accused_id = ${accusedId}::uuid AND pushed_at IS NULL AND status = 'pending'
          AND created_at <= ${new Date(now.getTime() - UNDO_MS)}
        RETURNING crime_key, filer_id, pair_id, created_at)
      SELECT crime_key AS "crimeKey", filer_id AS "filerId", pair_id AS "pairId" FROM c ORDER BY created_at`;
    if (!claimed.length) return;
    const filer = await this.prisma.member.findUniqueOrThrow({ where: { id: claimed[0]!.filerId } });
    await this.notify(
      accusedId,
      chargePushText(
        filer.displayName,
        claimed.map((c) => c.crimeKey),
        await loadBook(this.prisma, claimed[0]!.pairId),
      ),
    );
  }
}
