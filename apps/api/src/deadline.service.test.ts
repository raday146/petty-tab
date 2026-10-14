import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { TabEvent } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { DeadlineService } from './deadline.service.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';
import { VerdictsService } from './verdicts.service.js';

// Real database, injected clock, no workers; pushes are captured, events listened to per pair.
const prisma = new PrismaService();
const jobs = new Jobs();
beforeAll(() => jobs.start());
afterAll(async () => {
  await jobs.boss.deleteQueuedJobs(QUEUES.render);
  await Promise.all([prisma.$disconnect(), jobs.onModuleDestroy()]);
});

let now: Date;
const clock = { now: () => now } as Clock;
const events = new Events();
const push = new PushService(prisma, clock, jobs);
let sent: { memberId: string; body: string }[] = [];
push.notify = async (memberId, body) => void sent.push({ memberId, body });
const pairing = new PairingService(prisma, clock, events, push);
const charges = new ChargesService(prisma, clock, pairing, jobs, events, push);
const verdicts = new VerdictsService(prisma, clock, pairing, jobs, events, push);
const deadline = new DeadlineService(prisma, clock, pairing, events, push, verdicts);

const at = (iso: string): Date => new Date(iso);
beforeEach(() => {
  now = at('2026-10-14T09:00:00Z'); // Wednesday; the first cycle ends Sunday 18 Oct 20:00 Jerusalem
  sent = [];
});

/** Maya (a) and Alex (b) in Jerusalem; `ma`/`mb` are their member ids, `got` the pair's events. */
async function pair() {
  const [a, b] = await Promise.all([prisma.user.create({ data: {} }), prisma.user.create({ data: {} })]);
  const { link } = await pairing.createPair(a.id, {
    name: 'Maya',
    species: 'cat',
    timezone: 'Asia/Jerusalem',
  });
  await pairing.acceptInvite(b.id, link.replace('/j/', ''), { name: 'Alex', species: 'bear' });
  const me = await pairing.inPair(a.id);
  const [ma, mb] = me.pair.members.map((m) => m.id) as [string, string];
  const got: TabEvent['type'][] = [];
  events.forPair(me.pairId).subscribe((m) => got.push((m.data as TabEvent).type));
  sent = [];
  return { a: a.id, b: b.id, ma, mb, pairId: me.pairId, got };
}
const to = (memberId: string): string[] => sent.filter((s) => s.memberId === memberId).map((s) => s.body);
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: { getResponse(): { error: { code: string } } }) => e.getResponse().error.code,
  );

describe('settle now (spec §10)', () => {
  it('seals the cycle the moment the partner says yes, and opens the verdict on both phones', async () => {
    const { a, b, mb, pairId, got } = await pair();
    await charges.file(a, { crimeKey: 'trash' });
    await deadline.propose(a, { end: null });
    expect(to(mb)).toEqual(['Maya wants to settle the tab right now! Ready to face the verdict?']);
    expect((await charges.tab(b)).proposal).toEqual({ mine: false, end: null, label: null });
    expect(await code(deadline.accept(a))).toBe('not_allowed');

    now = at('2026-10-14T10:00:00Z');
    await deadline.accept(b);
    const v = await prisma.verdict.findFirstOrThrow({ where: { pairId } });
    expect(v.weekEnd).toEqual(now);
    expect(v.winnerId).not.toBeNull();
    expect(got).toContain('verdict.settled');
    // The next cycle starts now and runs to the first Sunday 20:00 at least 48 h away.
    expect(await charges.tab(a)).toMatchObject({
      lead: 0,
      charges: [],
      proposal: null,
      deadline: { end: '2026-10-18T17:00:00.000Z' },
    });
  });

  it('seals as dead even at 0–0', async () => {
    const { a, b, pairId } = await pair();
    await deadline.propose(b, { end: null });
    await deadline.accept(a);
    expect((await prisma.verdict.findFirstOrThrow({ where: { pairId } })).isTie).toBe(true);
  });
});

describe('moving the deadline (spec §10)', () => {
  const friday = '2026-10-16T18:00:00Z'; // Friday 21:00 Jerusalem

  it('moves only when the partner agrees, one proposal at a time', async () => {
    const { a, b, ma, mb, pairId } = await pair();
    await deadline.propose(a, { end: friday });
    expect(to(mb)).toEqual(['Maya is moving the goalposts: verdict Fri 21:00. Deal?']);
    expect(await code(deadline.propose(b, { end: null }))).toBe('proposal_open');
    expect((await charges.tab(a)).deadline.label).toBe('Sun 20:00');

    await deadline.accept(b);
    expect(to(ma)).toEqual(['Alex agreed. Verdict Fri 21:00.']);
    expect((await charges.tab(a)).deadline).toEqual({ end: '2026-10-16T18:00:00.000Z', label: 'Fri 21:00' });

    now = at(friday);
    expect(await verdicts.sealDue(now, { pairId })).toBe(1);
  });

  it('can be declined, withdrawn, refused when too close, and goes stale while it waits', async () => {
    const { a, b, ma } = await pair();
    expect(await code(deadline.propose(a, { end: '2026-10-14T09:30:00Z' }))).toBe('too_soon');
    expect(await code(deadline.propose(a, { end: '2026-11-14T09:30:00Z' }))).toBe('too_far');

    await deadline.propose(a, { end: friday });
    await deadline.decline(b);
    expect(to(ma)).toEqual(['Alex says nope.']);
    await deadline.propose(a, { end: null });
    await deadline.decline(b);
    expect(to(ma)).toEqual(['Alex says nope.', 'Alex says not yet.']);

    await deadline.propose(a, { end: friday });
    expect(await code(deadline.withdraw(b))).toBe('no_proposal');
    await deadline.withdraw(a);
    expect((await charges.tab(b)).proposal).toBeNull();

    await deadline.propose(a, { end: friday });
    now = at('2026-10-16T17:30:00Z');
    expect(await code(deadline.accept(b))).toBe('too_soon');
    expect((await charges.tab(a)).deadline.label).toBe('Sun 20:00');
  });

  it('lapses when its cycle seals', async () => {
    const { a, b } = await pair();
    await deadline.propose(a, { end: null });
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    expect((await charges.tab(b)).proposal).toBeNull();
    expect(await code(deadline.accept(b))).toBe('no_proposal');
  });
});

describe('the stored cycle (spec §10)', () => {
  it('files a charge made after the deadline, before the sealer runs, into the next cycle', async () => {
    const { a, pairId } = await pair();
    now = at('2026-10-18T17:01:00Z');
    const { id } = await charges.file(a, { crimeKey: 'trash' });
    expect((await prisma.charge.findUniqueOrThrow({ where: { id } })).weekStart).toEqual(
      at('2026-10-18T17:00:00Z'),
    );
    await verdicts.sealDue(now, { pairId });
    expect((await prisma.verdict.findFirstOrThrow({ where: { pairId } })).isTie).toBe(true);
    expect((await charges.tab(a)).charges).toHaveLength(1);
  });

  it('backfills pairs made before cycles were stored, from their last verdict', async () => {
    const { a, pairId } = await pair();
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue(now, { pairId });
    await prisma.pair.update({ where: { id: pairId }, data: { cycleStart: null, cycleEnd: null } });
    await verdicts.backfillCycles();
    expect((await charges.tab(a)).deadline.end).toBe('2026-10-25T18:00:00.000Z');
  });
});
