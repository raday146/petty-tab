import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CUSTOM_CRIMES_MAX } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { CrimesService } from './crimes.service.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';
import { VerdictsService } from './verdicts.service.js';

// Real database, injected clock, no workers; pushes are captured.
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
const crimes = new CrimesService(prisma, clock, pairing, events);

const at = (iso: string): Date => new Date(iso);
beforeEach(() => {
  now = at('2026-10-12T10:00:00Z'); // Monday 13:00 in Jerusalem
  sent = [];
});

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
  sent = [];
  return { a: a.id, b: b.id, ma, mb, pairId: me.pairId };
}
const tp = {
  title: 'Toilet paper roulette',
  description: 'One square left.',
  unit: 'foot',
  sticker: 'roll',
} as const;
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: { getResponse(): { error: { code: string } } }) => e.getResponse().error.code,
  );
const to = (memberId: string): string[] => sent.filter((s) => s.memberId === memberId).map((s) => s.body);

describe('custom crimes (spec §6)', () => {
  it('files, pleads and scores like a catalog crime, and stays readable once removed', async () => {
    const { a, b, ma } = await pair();
    const { id } = await crimes.create(a, { ...tp, chore: null });
    const crimeKey = `custom:${id}` as const;
    const charge = (await charges.file(a, { crimeKey })).id;
    await charges.plead(b, charge, { plea: 'appeal' });
    expect(to(ma)).toEqual(['Alex cries foul: Toilet paper roulette. Your call.']);
    await charges.decide(a, charge, { decision: 'uphold' });

    const tab = await charges.tab(b);
    expect(tab.custom).toEqual([{ id, ...tp, removed: false, chore: null }]);
    expect(tab.charges[0]).toMatchObject({ crime: crimeKey, status: 'upheld', filer: 'them' });
    expect(tab.themOwed).toEqual([{ unit: 'foot', count: 1 }]);

    await crimes.remove(b, id);
    expect(await code(charges.file(a, { crimeKey }))).toBe('not_allowed');
    expect((await charges.tab(a)).custom[0]).toMatchObject({ id, removed: true });
  });

  it('keeps a custom top crime’s title on the verdict after it is removed', async () => {
    const { a, pairId } = await pair();
    const { id } = await crimes.create(a, { ...tp, chore: null });
    await charges.file(a, { crimeKey: `custom:${id}` });
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue(now, { pairId });
    await crimes.remove(a, id);
    expect((await verdicts.view(a, 'latest')).topCrimes).toEqual([
      { crime: `custom:${id}`, count: 1, title: tp.title, sticker: 'roll' },
    ]);
  });

  it(`holds ${CUSTOM_CRIMES_MAX} at a time, and only the pair's own`, async () => {
    const { a, b } = await pair();
    for (let i = 0; i < CUSTOM_CRIMES_MAX; i++)
      await crimes.create(a, { ...tp, title: `Crime ${i}`, chore: null });
    expect(await code(crimes.create(b, { ...tp, chore: null }))).toBe('too_many_crimes');
    const other = await pair();
    const { id } = await crimes.create(other.a, { ...tp, chore: null });
    expect(await code(charges.file(a, { crimeKey: `custom:${id}` }))).toBe('not_allowed');
    expect(await code(crimes.remove(a, id))).toBe('not_allowed');
  });
});

describe('daily chores (spec §8)', () => {
  it('charges an unticked day once at midnight, never a ticked one or the creation day', async () => {
    const { a, b, ma, mb, pairId } = await pair();
    const { id } = await crimes.create(a, {
      ...tp,
      title: 'Dishes duty',
      unit: 'dish',
      sticker: 'dish',
      chore: 'them',
    });
    expect((await charges.tab(b)).custom[0]!.chore).toEqual({ owner: 'me', doneToday: false });
    expect(await code(crimes.done(a, id, true))).toBe('not_allowed');

    now = at('2026-10-13T10:00:00Z'); // Tuesday: Alex ticks it, unticks, ticks again
    await crimes.done(b, id, true);
    await crimes.done(b, id, false);
    await crimes.done(b, id, true);
    expect((await charges.tab(a)).custom[0]!.chore).toEqual({ owner: 'them', doneToday: true });

    // Wednesday 00:30 local: Monday was the creation day, Tuesday was ticked.
    expect(await charges.neglectedChores(at('2026-10-13T21:30:00Z'), { pairId })).toBe(0);
    // Thursday 01:00 local: Wednesday ended unticked. A second sweep is a no-op.
    expect(await charges.neglectedChores(at('2026-10-14T22:00:00Z'), { pairId })).toBe(1);
    expect(await charges.neglectedChores(at('2026-10-14T22:15:00Z'), { pairId })).toBe(0);
    const filed = await prisma.charge.findMany({ where: { pairId } });
    expect(filed).toMatchObject([
      {
        filerId: ma,
        accusedId: mb,
        crimeKey: `custom:${id}`,
        status: 'pending',
        createdAt: at('2026-10-14T21:00:00Z'),
      },
    ]);
    expect(to(mb)).toEqual(["Dishes duty didn't happen yesterday. It's on the tab."]);

    // Alex can dispute it like any charge.
    now = at('2026-10-14T22:30:00Z');
    await charges.plead(b, filed[0]!.id, { plea: 'appeal' });
    expect(to(ma)).toEqual(['Alex cries foul: Dishes duty. Your call.']);
  });

  it('stops charging once the chore is removed', async () => {
    const { a, pairId } = await pair();
    const { id } = await crimes.create(a, { ...tp, chore: 'me' });
    await crimes.remove(a, id);
    expect(await charges.neglectedChores(at('2026-10-14T22:00:00Z'), { pairId })).toBe(0);
  });
});
