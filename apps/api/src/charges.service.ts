import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  canUndo,
  currentWeek,
  FILING_LIMIT,
  FILING_WINDOW_MS,
  PLEA_MS,
  tally,
  transition,
  UNDO_MS,
  type appealBody,
  type fileChargeBody,
  type pleaBody,
  type CrimeKey,
  type SentenceKey,
  type Species,
  type TabView,
  type VerdictSnapshot,
} from '@petty-tab/shared';
import { z } from 'zod';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';

const notAllowed = (): ApiError => new ApiError(403, 'not_allowed', 'That is not yours to decide.');
const conflict = (code: string): ApiError =>
  new ApiError(409, code, code === 'undo_expired' ? 'Too late to undo.' : 'The plea is already in.');

/** spec §8–9: filing, undo, pleas, appeals, and the week's tab. */
@Injectable()
export class ChargesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly pairing: PairingService,
    private readonly jobs: Jobs,
    private readonly events: Events,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.start();
    const { boss } = this.jobs;
    // ponytail: the held push is a no-op until Web Push lands in M6; the 10 s hold and its cancel are real.
    await boss.work(QUEUES.chargePush, async () => undefined);
    await boss.work(QUEUES.autoGuilty, () => this.autoGuilty());
    await boss.schedule(QUEUES.autoGuilty, '* * * * *');
  }

  /** The caller, the partner and the current week; `pair_incomplete` while waiting. */
  private async complete(userId: string) {
    const me = await this.pairing.inPair(userId);
    const [first, second] = me.pair.members;
    if (!second) throw new ApiError(409, 'pair_incomplete', 'Your partner has not joined yet.');
    const them = me.id === first!.id ? second : first!;
    return { me, them, week: currentWeek(second.joinedAt, me.pair.timezone, this.clock.now()) };
  }

  /** A charge in the caller's pair and the caller's side of it. */
  private async charge(userId: string, id: string) {
    const me = await this.pairing.inPair(userId);
    const charge = z.uuid().safeParse(id).success
      ? await this.prisma.charge.findFirst({ where: { id, pairId: me.pairId } })
      : null;
    if (!charge) throw new ApiError(404, 'not_allowed', 'That charge is not on your tab.');
    // spec §8: once the charge's week has ended, nothing about it changes, sealed yet or not.
    const now = this.clock.now();
    const joined = me.pair.members[1]!.joinedAt;
    if (currentWeek(joined, me.pair.timezone, charge.weekStart).end <= now) {
      throw new ApiError(409, 'week_closed', 'That week is closed.');
    }
    const actor = charge.filerId === me.id ? ('filer' as const) : ('accused' as const);
    return { charge, actor, age: now.getTime() - charge.createdAt.getTime() };
  }

  async file(userId: string, body: z.output<typeof fileChargeBody>): Promise<{ id: string }> {
    const { me, them, week } = await this.complete(userId);
    const now = this.clock.now();
    // Undone charges are hard-deleted, so they never count toward the limit.
    // ponytail: count-then-insert; two simultaneous taps could make 11. Advisory lock if it ever shows up.
    const recent = await this.prisma.charge.count({
      where: { filerId: me.id, createdAt: { gt: new Date(now.getTime() - FILING_WINDOW_MS) } },
    });
    if (recent >= FILING_LIMIT) {
      throw new ApiError(429, 'rate_limited', 'Ten charges in a day is plenty. Try again tomorrow.');
    }
    const { id } = await this.prisma.charge.create({
      data: {
        pairId: me.pairId,
        weekStart: week.start,
        filerId: me.id,
        accusedId: them.id,
        crimeKey: body.crimeKey,
        createdAt: now,
      },
    });
    // spec §8: the accused's push waits out the undo window; the job id is the charge id, so undo can cancel it.
    await this.jobs.boss.send(QUEUES.chargePush, { chargeId: id }, { id, startAfter: UNDO_MS / 1000 });
    this.events.emit(me.pairId, 'charge.created', id);
    return { id };
  }

  async undo(userId: string, id: string): Promise<void> {
    const { charge, actor, age } = await this.charge(userId, id);
    if (actor !== 'filer') throw notAllowed();
    const refused = canUndo(charge.status, age);
    if (refused) throw conflict(refused);
    const { count } = await this.prisma.charge.deleteMany({ where: { id, status: 'pending' } });
    if (count !== 1) throw conflict('already_pleaded');
    await this.jobs.boss.cancel(QUEUES.chargePush, id);
    this.events.emit(charge.pairId, 'charge.deleted', id);
  }

  /**
   * spec §8: 24 hours without a plea counts as guilty, resolved at the 24-hour mark. Pleas past it are
   * already refused by transition(), so how late this runs never changes an outcome.
   */
  async autoGuilty(): Promise<{ id: string; pairId: string }[]> {
    const cutoff = new Date(this.clock.now().getTime() - PLEA_MS);
    const flipped = await this.prisma.$queryRaw<{ id: string; pairId: string }[]>`
      UPDATE charges SET status = 'guilty', resolved_at = created_at + interval '24 hours'
      WHERE status = 'pending' AND created_at <= ${cutoff}
      RETURNING id, pair_id AS "pairId"`;
    for (const c of flipped) this.events.emit(c.pairId, 'plea.guilty', c.id);
    return flipped;
  }

  async plead(userId: string, id: string, body: z.output<typeof pleaBody>): Promise<void> {
    const { charge, actor, age } = await this.charge(userId, id);
    const next = transition(charge.status, actor, body.plea, age);
    if ('error' in next) throw next.error === 'not_allowed' ? notAllowed() : conflict(next.error);
    const now = this.clock.now();
    // Only the first of two simultaneous pleas finds the charge still pending.
    const { count } = await this.prisma.charge.updateMany({
      where: { id, status: 'pending' },
      data: { status: next.status, pleadedAt: now, resolvedAt: next.status === 'guilty' ? now : null },
    });
    if (count !== 1) throw conflict('already_pleaded');
    this.events.emit(charge.pairId, body.plea === 'guilty' ? 'plea.guilty' : 'plea.appeal', id);
  }

  async decide(userId: string, id: string, body: z.output<typeof appealBody>): Promise<void> {
    const { charge, actor, age } = await this.charge(userId, id);
    const next = transition(charge.status, actor, body.decision, age);
    if ('error' in next) throw notAllowed();
    const { count } = await this.prisma.charge.updateMany({
      where: { id, status: 'appealed' },
      data: { status: next.status, resolvedAt: this.clock.now() },
    });
    if (count !== 1) throw notAllowed();
    this.events.emit(charge.pairId, body.decision === 'uphold' ? 'appeal.upheld' : 'appeal.dropped', id);
  }

  async tab(userId: string): Promise<TabView> {
    const { me, them, week } = await this.complete(userId);
    const [rows, verdicts] = await Promise.all([
      this.prisma.charge.findMany({
        where: { pairId: me.pairId, weekStart: week.start },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.verdict.findMany({ where: { pairId: me.pairId }, orderBy: { weekStart: 'asc' } }),
    ]);
    const charges = rows.map((c) => ({ ...c, crime: c.crimeKey as CrimeKey }));
    const { lead, meOwed, themOwed } = tally(charges, me.id);
    return {
      me: { name: me.displayName, species: me.species as Species },
      them: { name: them.displayName, species: them.species as Species },
      lead,
      meOwed,
      themOwed,
      charges: charges.reverse().map((c) => ({
        id: c.id,
        crime: c.crime,
        status: c.status,
        filer: c.filerId === me.id ? 'me' : 'them',
      })),
      hasVerdict: verdicts.length > 0,
      unconfirmed: verdicts
        .filter((v) => !v.isTie && !v.confirmedAt)
        .map((v) => {
          const snap = v.snapshot as unknown as VerdictSnapshot;
          return { winner: snap.winner.name, loser: snap.loser.name, sentence: v.sentenceKey as SentenceKey };
        }),
    };
  }
}
