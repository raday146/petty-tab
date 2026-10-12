import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  endedWeeks,
  judge,
  pushText,
  reminderDue,
  renderKey,
  seedSentence,
  sentenceDeadline,
  sentenceLocked,
  type CrimeKey,
  type RenderedJob,
  type RenderJob,
  type RenderKind,
  type SentenceKey,
  type Species,
  type sentenceBody,
  type VerdictSnapshot,
  type VerdictView,
} from '@petty-tab/shared';
import { z } from 'zod';
import { Clock } from './clock.js';
import { signedFileUrl } from './crypto.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';

const notAllowed = (): ApiError => new ApiError(403, 'not_allowed', 'That is not yours to decide.');

/** spec §10: sealing the week, and the verdict's sentence, share, served and confirm. */
@Injectable()
export class VerdictsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly pairing: PairingService,
    private readonly jobs: Jobs,
    private readonly events: Events,
    private readonly push: PushService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.start();
    await this.jobs.boss.work(QUEUES.seal, () => this.sealDue());
    await this.jobs.boss.schedule(QUEUES.seal, '*/5 * * * *');
    // Every 15 minutes, so Wednesday 19:00 lands on time in :30 and :45 zones too.
    await this.jobs.boss.work(QUEUES.reminder, () => this.remind());
    await this.jobs.boss.schedule(QUEUES.reminder, '*/15 * * * *');
    // Cheap updates: take them in batches so a renderer catching up never queues behind a 2 s poll per job.
    await this.jobs.boss.work<RenderedJob>(QUEUES.rendered, { batchSize: 20 }, async (batch) => {
      for (const job of batch) await this.rendered(job.data);
    });
  }

  /**
   * spec §10: seals every ended, unsealed week of every complete pair, oldest first, so a sealer that was
   * down catches up. Returns how many verdicts it sealed.
   */
  async sealDue(now = this.clock.now(), only?: { pairId: string }): Promise<number> {
    // ponytail: reads every active pair each run; store the next week_end on the pair and index it if the
    // pair count makes this slow.
    const pairs = await this.prisma.pair.findMany({
      where: { endedAt: null, id: only?.pairId },
      include: {
        members: { orderBy: { joinedAt: 'asc' } },
        verdicts: { orderBy: { weekStart: 'desc' }, take: 1 },
      },
    });
    let sealed = 0;
    for (const pair of pairs) {
      const [first, second] = pair.members;
      if (!first || !second) continue;
      const after = pair.verdicts[0]?.weekEnd ?? second.joinedAt;
      for (const week of endedWeeks(second.joinedAt, pair.timezone, after, now)) {
        if (await this.seal(pair.id, [first, second], week, now)) sealed++;
      }
    }
    return sealed;
  }

  /** One week, in one transaction. The unique (pair_id, week_start) makes a second seal a no-op. */
  private async seal(
    pairId: string,
    members: [Member, Member],
    week: { start: Date; end: Date },
    now: Date,
  ): Promise<boolean> {
    const id = await this.prisma.$transaction(async (tx) => {
      // Step 1: final statuses, resolved at week_end (Open decision 1: unresolved appeals are dropped).
      const where = { pairId, weekStart: week.start };
      await tx.charge.updateMany({
        where: { ...where, status: 'pending' },
        data: { status: 'guilty', resolvedAt: week.end },
      });
      await tx.charge.updateMany({
        where: { ...where, status: 'appealed' },
        data: { status: 'dropped', resolvedAt: week.end },
      });
      const charges = await tx.charge.findMany({ where });
      const v = judge(
        charges.map((c) => ({ ...c, crime: c.crimeKey as CrimeKey })),
        [members[0].id, members[1].id],
      );
      const side = (memberId: string, points: number) => {
        const m = memberId === members[0].id ? members[0] : members[1];
        return { name: m.displayName, species: m.species as Species, points };
      };
      const snapshot: VerdictSnapshot = {
        winner: side(v.winnerId, v.points[0]),
        loser: side(v.loserId, v.points[1]),
        topCrimes: v.topCrimes,
      };
      const [row] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO verdicts (pair_id, week_start, week_end, sealed_at, winner_id, loser_id, is_tie, snapshot)
        VALUES (${pairId}::uuid, ${week.start}, ${week.end}, ${now},
                ${v.tie ? null : v.winnerId}::uuid, ${v.tie ? null : v.loserId}::uuid, ${v.tie},
                ${JSON.stringify(snapshot)}::jsonb)
        ON CONFLICT (pair_id, week_start) DO NOTHING
        RETURNING id`;
      if (row && !v.tie) {
        await tx.verdict.update({ where: { id: row.id }, data: { sentenceKey: seedSentence(row.id) } });
      }
      return row?.id;
    });
    if (!id) return false;
    this.events.emit(pairId, 'verdict.sealed');
    const { winnerId, isTie } = await this.prisma.verdict.findUniqueOrThrow({ where: { id } });
    for (const m of members) {
      const type = isTie ? 'verdict.tie' : m.id === winnerId ? 'verdict.won' : 'verdict.lost';
      await this.push.notify(m.id, pushText({ type }));
    }
    await this.queueRenders(id);
    return true;
  }

  /** spec §12: the loser's Wednesday 19:00 reminder, while the sentence is neither served nor confirmed. */
  async remind(): Promise<number> {
    const now = this.clock.now();
    // ponytail: scans every open sentence each sweep; add an index or a due-at column if that list grows.
    const open = await this.prisma.verdict.findMany({
      where: { isTie: false, servedAt: null, confirmedAt: null, pair: { endedAt: null } },
      include: { pair: true },
    });
    let sent = 0;
    for (const v of open) {
      if (!reminderDue(v.sealedAt, v.remindedAt, v.pair.timezone, now)) continue;
      // Only one of two overlapping sweeps moves reminded_at on.
      const { count } = await this.prisma.verdict.updateMany({
        where: { id: v.id, remindedAt: v.remindedAt },
        data: { remindedAt: now },
      });
      if (!count) continue;
      const snap = v.snapshot as unknown as VerdictSnapshot;
      const sentenceKey = v.sentenceKey as SentenceKey;
      await this.push.notify(v.loserId!, pushText({ type: 'reminder', name: snap.winner.name, sentenceKey }));
      sent++;
    }
    return sent;
  }

  /** spec §11: a card for every verdict, a reel unless it is a tie, drawn from the snapshot. */
  private async queueRenders(verdictId: string): Promise<void> {
    const v = await this.prisma.verdict.findUniqueOrThrow({ where: { id: verdictId } });
    const snap = v.snapshot as unknown as VerdictSnapshot;
    const sentence = v.sentenceKey as SentenceKey | null;
    const input = {
      winner: { name: snap.winner.name, species: snap.winner.species },
      loser: { name: snap.loser.name, species: snap.loser.species },
      tie: v.isTie,
      topCrimes: snap.topCrimes,
      sentence,
    };
    for (const kind of v.isTie ? (['card'] as const) : (['card', 'reel'] as const)) {
      const key = renderKey(v.id, kind, sentence);
      const job: RenderJob = { verdictId: v.id, kind, key, input };
      await this.jobs.boss.send(QUEUES.render, job, { singletonKey: key });
    }
  }

  /** A render landed: keep it only if it still draws the current sentence, and tell the pair. */
  async rendered({ verdictId, kind, key }: RenderedJob): Promise<void> {
    const v = await this.prisma.verdict.findUnique({ where: { id: verdictId } });
    if (!v || key !== renderKey(v.id, kind, v.sentenceKey as SentenceKey | null)) return;
    await this.prisma.verdict.update({ where: { id: v.id }, data: { [`${kind}Url`]: key } });
    this.events.emit(v.pairId, 'verdict.updated');
  }

  /** `GET /verdicts/:id/card|reel`: a short-lived signed URL, or 404 until the render lands. */
  async file(userId: string, id: string, kind: RenderKind): Promise<string> {
    const { verdict, now } = await this.find(userId, id);
    const key = kind === 'card' ? verdict.cardUrl : verdict.reelUrl;
    if (!key) throw new ApiError(404, 'not_rendered', 'Still printing.');
    return signedFileUrl(key, now);
  }

  /** The verdict (`latest` or an id) in the caller's pair, and the caller's role in it. */
  private async find(userId: string, id: string) {
    const me = await this.pairing.inPair(userId);
    const where =
      id === 'latest'
        ? { pairId: me.pairId }
        : z.uuid().safeParse(id).success
          ? { id, pairId: me.pairId }
          : null;
    const verdict = where
      ? await this.prisma.verdict.findFirst({ where, orderBy: { weekStart: 'desc' } })
      : null;
    if (!verdict) throw new ApiError(404, 'not_allowed', 'There is no verdict yet.');
    const now = this.clock.now();
    const locked = sentenceLocked(
      verdict.sentenceLockedAt,
      sentenceDeadline(verdict.weekEnd, me.pair.timezone),
      now,
    );
    // On a tie the snapshot keeps join order; the first member reads as the "winner" side.
    const role = (verdict.winnerId ?? me.pair.members[0]!.id) === me.id ? 'winner' : 'loser';
    return { me, verdict, role, locked, now } as const;
  }

  async view(userId: string, id: string): Promise<VerdictView> {
    const { verdict: v, role, locked } = await this.find(userId, id);
    const snap = v.snapshot as unknown as VerdictSnapshot;
    return {
      id: v.id,
      viewer: role,
      winner: { name: snap.winner.name, species: snap.winner.species },
      loser: { name: snap.loser.name, species: snap.loser.species },
      tie: v.isTie,
      topCrimes: snap.topCrimes,
      sentence: v.sentenceKey as SentenceKey | null,
      locked,
      served: v.servedAt !== null,
      confirmed: v.confirmedAt !== null,
      card: v.cardUrl !== null,
      reel: v.reelUrl !== null,
    };
  }

  /** spec §10: the winner changes the sentence until it locks. */
  async setSentence(userId: string, id: string, body: z.output<typeof sentenceBody>): Promise<void> {
    const { verdict, role, locked } = await this.find(userId, id);
    if (verdict.isTie || role !== 'winner') throw notAllowed();
    const { count } = locked
      ? { count: 0 }
      : await this.prisma.verdict.updateMany({
          where: { id: verdict.id, sentenceLockedAt: null },
          data: { sentenceKey: body.sentenceKey, cardUrl: null, reelUrl: null },
        });
    if (count !== 1) throw new ApiError(409, 'sentence_locked', 'The sentence is final.');
    this.events.emit(verdict.pairId, 'verdict.updated');
    await this.queueRenders(verdict.id);
  }

  /** spec §10: the winner's first share locks the sentence; the loser's share changes nothing. */
  async shared(userId: string, id: string): Promise<void> {
    const { verdict, role, now } = await this.find(userId, id);
    if (verdict.isTie || role !== 'winner') return;
    const { count } = await this.prisma.verdict.updateMany({
      where: { id: verdict.id, sharedAt: null },
      data: { sharedAt: now, sentenceLockedAt: verdict.sentenceLockedAt ?? now },
    });
    if (count) this.events.emit(verdict.pairId, 'verdict.updated');
  }

  /** spec §10: the loser marks the sentence served. */
  async served(userId: string, id: string): Promise<void> {
    const { verdict, role, now } = await this.find(userId, id);
    if (verdict.isTie || role !== 'loser') throw notAllowed();
    const { count } = await this.prisma.verdict.updateMany({
      where: { id: verdict.id, servedAt: null },
      data: { servedAt: now },
    });
    if (count) this.events.emit(verdict.pairId, 'verdict.updated');
  }

  /** spec §10: the winner confirms, once it is marked served. */
  async confirm(userId: string, id: string): Promise<void> {
    const { verdict, role, now } = await this.find(userId, id);
    if (verdict.isTie || role !== 'winner' || !verdict.servedAt) throw notAllowed();
    const { count } = await this.prisma.verdict.updateMany({
      where: { id: verdict.id, confirmedAt: null },
      data: { confirmedAt: now },
    });
    if (count) this.events.emit(verdict.pairId, 'verdict.updated');
  }
}

type Member = { id: string; displayName: string; species: string };
