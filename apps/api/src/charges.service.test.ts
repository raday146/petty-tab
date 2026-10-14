import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PLEA_MS, UNDO_MS, type CrimeKey } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { Jobs, QUEUES } from './jobs.js';
import { Events } from './events.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';

// Real database; every test makes its own pair, so no cleanup is needed.
// Workers are not registered here (no onModuleInit), so jobs only queue; autoGuilty() is called directly.
const prisma = new PrismaService();
const jobs = new Jobs();
beforeAll(() => jobs.start());
// The pushes these tests queue would otherwise wait for a local API to send them.
afterAll(async () => {
  await jobs.boss.deleteQueuedJobs(QUEUES.push);
  await Promise.all([prisma.$disconnect(), jobs.onModuleDestroy()]);
});

let now: Date;
const clock = { now: () => now } as Clock;
const events = new Events();
const push = new PushService(prisma, clock, jobs);
const pairing = new PairingService(prisma, clock, events, push);
const service = new ChargesService(prisma, clock, pairing, jobs, events, push);
beforeEach(() => {
  now = new Date('2026-10-12T10:00:00Z');
});
const later = (ms: number): void => {
  now = new Date(now.getTime() + ms);
};

const newUser = async (): Promise<string> => (await prisma.user.create({ data: {} })).id;
const code = (p: Promise<unknown>): Promise<unknown> =>
  p.then(
    () => 'ok',
    (e: { getResponse?: () => { error: { code: string } } }) => e.getResponse?.().error.code ?? e,
  );

/** Maya (a) and Alex (b) share a complete tab. */
async function pair() {
  const a = await newUser();
  const b = await newUser();
  const { link } = await pairing.createPair(a, { name: 'Maya', species: 'cat', timezone: 'Asia/Jerusalem' });
  await pairing.acceptInvite(b, link.replace('/j/', ''), { name: 'Alex', species: 'bear' });
  return { a, b };
}
const file = async (user: string, crimeKey: CrimeKey = 'trash'): Promise<string> =>
  (await service.file(user, { crimeKey })).id;

describe('filing (spec §8)', () => {
  it('files against the partner; both see it on the tab', async () => {
    const { a, b } = await pair();
    const id = await file(a, 'trash');
    expect((await service.tab(a)).charges).toEqual([{ id, crime: 'trash', status: 'pending', filer: 'me' }]);
    expect((await service.tab(b)).charges).toEqual([
      { id, crime: 'trash', status: 'pending', filer: 'them' },
    ]);
  });

  it('is refused while the partner has not joined', async () => {
    const a = await newUser();
    await pairing.createPair(a, { name: 'Maya', species: 'cat', timezone: 'Asia/Jerusalem' });
    expect(await code(service.file(a, { crimeKey: 'sip' }))).toBe('pair_incomplete');
  });

  it('is refused without a pair', async () => {
    expect(await code(service.file(await newUser(), { crimeKey: 'sip' }))).toBe('not_in_pair');
  });

  it('has no daily cap: the 11th charge in an hour is filed', async () => {
    const { a } = await pair();
    for (let i = 0; i < 10; i++) {
      await file(a);
      later(60_000);
    }
    expect(await code(service.file(a, { crimeKey: 'sip' }))).toBe('ok');
  });
});

describe('undo (spec §8)', () => {
  it('removes the charge for both members within 10 seconds', async () => {
    const { a, b } = await pair();
    const id = await file(a);
    later(UNDO_MS - 1);
    await service.undo(a, id);
    expect((await service.tab(b)).charges).toEqual([]);
  });

  it('tells the pair live: created, then deleted', async () => {
    const { a } = await pair();
    const { pairId } = await pairing.inPair(a);
    const got: unknown[] = [];
    const sub = events.forPair(pairId).subscribe((m) => got.push(m.data));
    const id = await file(a);
    await service.undo(a, id);
    sub.unsubscribe();
    expect(got).toEqual([
      { type: 'charge.created', chargeId: id },
      { type: 'charge.deleted', chargeId: id },
    ]);
  });

  it('cancels the held push', async () => {
    const { a } = await pair();
    const id = await file(a);
    expect((await jobs.boss.getJobById(QUEUES.chargePush, id))?.state).toBe('created');
    await service.undo(a, id);
    expect((await jobs.boss.getJobById(QUEUES.chargePush, id))?.state).toBe('cancelled');
  });

  it('is refused at 10 seconds', async () => {
    const { a } = await pair();
    const id = await file(a);
    later(UNDO_MS);
    expect(await code(service.undo(a, id))).toBe('undo_expired');
  });

  it('is refused after a plea', async () => {
    const { a, b } = await pair();
    const id = await file(a);
    await service.plead(b, id, { plea: 'guilty' });
    expect(await code(service.undo(a, id))).toBe('already_pleaded');
  });

  it('is the filer’s only', async () => {
    const { a, b } = await pair();
    const id = await file(a);
    expect(await code(service.undo(b, id))).toBe('not_allowed');
  });
});

describe('pleas and appeals (spec §8)', () => {
  it('guilty: the accused pleads, the charge keeps counting', async () => {
    const { a, b } = await pair();
    const id = await file(a, 'trash');
    await service.plead(b, id, { plea: 'guilty' });
    const tab = await service.tab(a);
    expect(tab.charges[0]!.status).toBe('guilty');
    expect(tab.meOwed).toEqual([{ unit: 'dish', count: 1 }]);
    const row = await prisma.charge.findUniqueOrThrow({ where: { id } });
    expect([row.pleadedAt, row.resolvedAt]).toEqual([now, now]);
  });

  it('appeal: stops counting until the filer upholds', async () => {
    const { a, b } = await pair();
    const id = await file(a, 'sip');
    await service.plead(b, id, { plea: 'appeal' });
    expect(await service.tab(a)).toMatchObject({ lead: 0, meOwed: [], charges: [{ status: 'appealed' }] });
    await service.decide(a, id, { decision: 'uphold' });
    expect(await service.tab(b)).toMatchObject({
      lead: -1,
      themOwed: [{ unit: 'coffee', count: 1 }],
      charges: [{ status: 'upheld' }],
    });
  });

  it('appeal dropped: never counts', async () => {
    const { a, b } = await pair();
    const id = await file(a, 'sip');
    await service.plead(b, id, { plea: 'appeal' });
    await service.decide(a, id, { decision: 'drop' });
    expect(await service.tab(a)).toMatchObject({ lead: 0, charges: [{ status: 'dropped' }] });
  });

  it('refuses the filer pleading, the accused deciding, and a second plea', async () => {
    const { a, b } = await pair();
    const id = await file(a);
    expect(await code(service.plead(a, id, { plea: 'guilty' }))).toBe('not_allowed');
    await service.plead(b, id, { plea: 'appeal' });
    expect(await code(service.decide(b, id, { decision: 'drop' }))).toBe('not_allowed');
    expect(await code(service.plead(b, id, { plea: 'guilty' }))).toBe('already_pleaded');
  });

  it('refuses a plea after 24 hours of silence', async () => {
    const { a, b } = await pair();
    const id = await file(a);
    later(PLEA_MS);
    expect(await code(service.plead(b, id, { plea: 'appeal' }))).toBe('already_pleaded');
  });

  it('keeps other pairs out', async () => {
    const { a } = await pair();
    const { b: outsider } = await pair();
    const id = await file(a);
    expect(await code(service.plead(outsider, id, { plea: 'guilty' }))).toBe('not_allowed');
    expect(await code(service.undo(outsider, 'not-a-uuid'))).toBe('not_allowed');
  });
});

describe('auto-guilty (spec §8, Open decision 2)', () => {
  it('turns charges pending for 24 hours guilty, resolved at the 24-hour mark', async () => {
    const { a } = await pair();
    const old = await file(a);
    const filedAt = now;
    later(PLEA_MS - 1000);
    const young = await file(a);
    later(1000);
    const flipped = await service.autoGuilty();
    expect(flipped.map((c) => c.id)).toContain(old);
    expect(flipped.map((c) => c.id)).not.toContain(young);
    const row = await prisma.charge.findUniqueOrThrow({ where: { id: old } });
    expect([row.status, row.resolvedAt, row.pleadedAt]).toEqual([
      'guilty',
      new Date(filedAt.getTime() + PLEA_MS),
      null,
    ]);
    expect((await prisma.charge.findUniqueOrThrow({ where: { id: young } })).status).toBe('pending');
  });
});

describe('/tab (spec §9)', () => {
  it('scores the week from each side, charges newest first', async () => {
    const { a, b } = await pair();
    const sip = await file(a, 'sip');
    later(1000);
    const dj = await file(b, 'dj');
    later(1000);
    const roll = await file(a, 'roll');
    expect(await service.tab(a)).toEqual({
      me: { name: 'Maya', species: 'cat' },
      them: { name: 'Alex', species: 'bear' },
      lead: 1,
      meOwed: [
        { unit: 'coffee', count: 1 },
        { unit: 'dish', count: 1 },
      ],
      themOwed: [{ unit: 'foot', count: 1 }],
      charges: [
        { id: roll, crime: 'roll', status: 'pending', filer: 'me' },
        { id: dj, crime: 'dj', status: 'pending', filer: 'them' },
        { id: sip, crime: 'sip', status: 'pending', filer: 'me' },
      ],
      hasVerdict: false,
      deadline: { end: '2026-10-18T17:00:00.000Z', label: 'Sun 20:00' },
      proposal: null,
      unconfirmed: [],
    });
    expect((await service.tab(b)).lead).toBe(-1);
  });

  it('starts the next week at 0–0', async () => {
    const { a } = await pair();
    await file(a);
    now = new Date('2026-10-18T17:00:00Z'); // the first Sunday 20:00 in Jerusalem, 48 h after joining
    expect(await service.tab(a)).toMatchObject({ lead: 0, charges: [] });
  });
});
