import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  bookFor,
  breakdown,
  canUndo,
  choreDaysDue,
  crimeInfo,
  customKey,
  cycleAt,
  dayEnd,
  deadlineLabel,
  isCustomKey,
  localDay,
  PLEA_MS,
  pushText,
  tally,
  transition,
  UNDO_MS,
  type appealBody,
  type BreakdownView,
  type CrimeKey,
  type CycleDays,
  type fileChargeBody,
  type pleaBody,
  type SentenceKey,
  type StickerKey,
  type UnitKey,
  type Species,
  type TabView,
  type VerdictSnapshot,
} from '@petty-tab/shared';
import { z } from 'zod';
import { loadBook } from './book.js';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';

/** The pair's current cycle (spec §10); only called on a complete pair, which always has one. */
export const currentCycle = (
  pair: { cycleStart: Date | null; cycleEnd: Date | null; timezone: string; cycleDays: number | null },
  now: Date,
): { start: Date; end: Date } =>
  cycleAt({ start: pair.cycleStart!, end: pair.cycleEnd! }, pair.timezone, now, pair.cycleDays);

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
    private readonly push: PushService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.start();
    const { boss } = this.jobs;
    await boss.work(QUEUES.autoGuilty, () => this.autoGuilty());
    await boss.schedule(QUEUES.autoGuilty, '* * * * *');
    // Every 15 minutes, so local midnight in :30 and :45 zones is never more than a sweep late.
    await boss.work(QUEUES.chores, () => this.neglectedChores());
    await boss.schedule(QUEUES.chores, '*/15 * * * *');
  }

  /** The caller, the partner and the current week; `pair_incomplete` while waiting. */
  private async complete(userId: string) {
    const me = await this.pairing.inPair(userId);
    const [first, second] = me.pair.members;
    if (!second) throw new ApiError(409, 'pair_incomplete', 'Your partner has not joined yet.');
    const them = me.id === first!.id ? second : first!;
    return { me, them, week: currentCycle(me.pair, this.clock.now()) };
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
    if (!me.pair.cycleEnd || charge.weekStart.getTime() !== currentCycle(me.pair, now).start.getTime()) {
      throw new ApiError(409, 'week_closed', 'That week is closed.');
    }
    const actor = charge.filerId === me.id ? ('filer' as const) : ('accused' as const);
    return { me, charge, actor, age: now.getTime() - charge.createdAt.getTime() };
  }

  async file(userId: string, body: z.output<typeof fileChargeBody>): Promise<{ id: string }> {
    const { me, them, week } = await this.complete(userId);
    const now = this.clock.now();
    // spec §6: a catalog crime the pair kept in play, or one of its own still in the picker.
    if (me.pair.crimesOff.includes(body.crimeKey)) {
      throw new ApiError(404, 'not_allowed', 'That crime is not on your list.');
    }
    if (
      isCustomKey(body.crimeKey) &&
      !(await this.prisma.customCrime.findFirst({
        where: { id: body.crimeKey.slice('custom:'.length), pairId: me.pairId, removedAt: null },
      }))
    ) {
      throw new ApiError(404, 'not_allowed', 'That crime is not on your list.');
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
    const { me, charge, actor, age } = await this.charge(userId, id);
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
    const name = me.displayName;
    await this.push.notify(
      charge.filerId,
      pushText(
        body.plea === 'guilty'
          ? { type: 'plea.guilty', name }
          : {
              type: 'plea.appeal',
              name,
              title: crimeInfo(await loadBook(this.prisma, charge.pairId), charge.crimeKey).title,
            },
      ),
    );
  }

  async decide(userId: string, id: string, body: z.output<typeof appealBody>): Promise<void> {
    const { me, charge, actor, age } = await this.charge(userId, id);
    const next = transition(charge.status, actor, body.decision, age);
    if ('error' in next) throw notAllowed();
    const { count } = await this.prisma.charge.updateMany({
      where: { id, status: 'appealed' },
      data: { status: next.status, resolvedAt: this.clock.now() },
    });
    if (count !== 1) throw notAllowed();
    const type = body.decision === 'uphold' ? 'appeal.upheld' : 'appeal.dropped';
    this.events.emit(charge.pairId, type, id);
    await this.push.notify(charge.accusedId, pushText({ type, name: me.displayName }));
  }

  async tab(userId: string): Promise<TabView> {
    const { me, them, week } = await this.complete(userId);
    const today = new Date(localDay(this.clock.now(), me.pair.timezone));
    const [rows, verdicts, own] = await Promise.all([
      this.prisma.charge.findMany({
        where: { pairId: me.pairId, weekStart: week.start },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.verdict.findMany({ where: { pairId: me.pairId }, orderBy: { weekStart: 'asc' } }),
      this.prisma.customCrime.findMany({
        where: { pairId: me.pairId },
        include: { days: { where: { day: today, doneAt: { not: null } } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const custom = own.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      sticker: c.sticker as StickerKey,
      unit: c.unit as UnitKey,
      removed: c.removedAt !== null,
      chore: c.choreOwnerId
        ? {
            owner: c.choreOwnerId === me.id ? ('me' as const) : ('them' as const),
            doneToday: c.days.length > 0,
          }
        : null,
    }));
    const charges = rows.map((c) => ({ ...c, crime: c.crimeKey }));
    const { lead, meOwed, themOwed } = tally(charges, me.id, bookFor(custom));
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
      custom,
      crimesOff: me.pair.crimesOff as CrimeKey[],
      cycleDays: me.pair.cycleDays as CycleDays,
      hasVerdict: verdicts.length > 0,
      deadline: { end: week.end.toISOString(), label: deadlineLabel(week.end, me.pair.timezone) },
      proposal: me.pair.proposalBy
        ? {
            mine: me.pair.proposalBy === me.id,
            end: me.pair.proposalEnd?.toISOString() ?? null,
            label: me.pair.proposalEnd ? deadlineLabel(me.pair.proposalEnd, me.pair.timezone) : null,
          }
        : null,
      unconfirmed: verdicts
        .filter((v) => !v.isTie && !v.confirmedAt)
        .map((v) => {
          const snap = v.snapshot as unknown as VerdictSnapshot;
          return { winner: snap.winner.name, loser: snap.loser.name, sentence: v.sentenceKey as SentenceKey };
        }),
    };
  }

  /** The Breakdown screen: this week by crime, chores, every past verdict and all-time stats. */
  async breakdown(userId: string): Promise<BreakdownView> {
    const { me, them, week } = await this.complete(userId);
    const pairId = me.pairId;
    const [all, verdicts, chores, book] = await Promise.all([
      this.prisma.charge.findMany({ where: { pairId } }),
      this.prisma.verdict.findMany({ where: { pairId }, orderBy: { weekStart: 'asc' } }),
      this.prisma.customCrime.findMany({
        where: { pairId, choreOwnerId: { not: null }, removedAt: null },
        include: { days: { where: { day: { gte: new Date(localDay(week.start, me.pair.timezone)) } } } },
      }),
      loadBook(this.prisma, pairId),
    ]);
    const charge = (c: (typeof all)[number]) => ({ filerId: c.filerId, crime: c.crimeKey, status: c.status });
    return breakdown({
      me: { id: me.id, name: me.displayName },
      them: { id: them.id, name: them.displayName },
      week: all.filter((c) => c.weekStart.getTime() === week.start.getTime()).map(charge),
      allCharges: all.map(charge),
      chores: chores.map((c) => ({
        title: c.title,
        ownerId: c.choreOwnerId!,
        done: c.days.filter((d) => d.doneAt).length,
        neglected: c.days.filter((d) => d.chargeId).length,
      })),
      verdicts: verdicts.map((v) => ({ ...v, snapshot: v.snapshot as unknown as VerdictSnapshot })),
      book,
    });
  }

  /**
   * spec §8: a chore day that ended unticked files one charge, from the partner against the chore's owner, at
   * the day's end. The (crime_id, day) key makes a second sweep a no-op; a tick inserts the same row first.
   */
  async neglectedChores(now = this.clock.now(), only?: { pairId: string }): Promise<number> {
    const chores = await this.prisma.customCrime.findMany({
      where: {
        pairId: only?.pairId,
        choreOwnerId: { not: null },
        removedAt: null,
        pair: { endedAt: null, cycleEnd: { not: null } },
      },
      include: { pair: { include: { members: true } } },
    });
    let filed = 0;
    for (const chore of chores) {
      const { pair } = chore;
      const owner = chore.choreOwnerId!;
      const partner = pair.members.find((m) => m.id !== owner);
      if (!partner) continue;
      for (const day of choreDaysDue(chore.createdAt, pair.timezone, now)) {
        const end = dayEnd(day, pair.timezone);
        // ponytail: a day that ended in an already sealed cycle (the sweep was down across a verdict) is
        // charged in the current one: cycleAt never goes back before the stored cycle.
        const week = currentCycle(pair, end);
        const charged = await this.prisma.$transaction(async (tx) => {
          const [row] = await tx.$queryRaw<unknown[]>`
            INSERT INTO chore_days (crime_id, day) VALUES (${chore.id}::uuid, ${day}::date)
            ON CONFLICT DO NOTHING RETURNING crime_id`;
          if (!row) return null;
          const charge = await tx.charge.create({
            data: {
              pairId: pair.id,
              weekStart: week.start,
              filerId: partner.id,
              accusedId: owner,
              crimeKey: customKey(chore.id),
              createdAt: end,
              // Its own push below, not the "Maya filed" one.
              pushedAt: now,
            },
          });
          await tx.choreDay.update({
            where: { crimeId_day: { crimeId: chore.id, day: new Date(day) } },
            data: { chargeId: charge.id },
          });
          return charge.id;
        });
        if (!charged) continue;
        filed++;
        this.events.emit(pair.id, 'charge.created', charged);
        await this.push.notify(owner, pushText({ type: 'chore.neglected', title: chore.title }));
      }
    }
    return filed;
  }
}
