import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  endedWeeks,
  judge,
  seedSentence,
  sentenceDeadline,
  sentenceLocked,
  type CrimeKey,
  type SentenceKey,
  type Species,
  type sentenceBody,
  type VerdictSnapshot,
  type VerdictView,
} from '@petty-tab/shared';
import { z } from 'zod';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';

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
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.start();
    await this.jobs.boss.work(QUEUES.seal, () => this.sealDue());
    await this.jobs.boss.schedule(QUEUES.seal, '*/5 * * * *');
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
    if (id) this.events.emit(pairId, 'verdict.sealed');
    return id !== undefined;
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
          data: { sentenceKey: body.sentenceKey },
        });
    if (count !== 1) throw new ApiError(409, 'sentence_locked', 'The sentence is final.');
    this.events.emit(verdict.pairId, 'verdict.updated');
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
