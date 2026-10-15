import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CRIME_KEYS } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';
import { VerdictsService } from './verdicts.service.js';

// spec §4 and §10: the rules the creator sets up before the invite. Real database, injected clock.
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
push.notify = async () => undefined;
const pairing = new PairingService(prisma, clock, events, push);
const charges = new ChargesService(prisma, clock, pairing, jobs, events, push);
const verdicts = new VerdictsService(prisma, clock, pairing, jobs, events, push);

const at = (iso: string): Date => new Date(iso);
beforeEach(() => {
  now = at('2026-10-12T10:00:00Z'); // Monday 13:00 in Jerusalem
});
const user = async (): Promise<string> => (await prisma.user.create({ data: {} })).id;
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: { getResponse(): { error: { code: string } } }) => e.getResponse().error.code,
  );
type Rules = Parameters<PairingService['createPair']>[1]['rules'];
const rules: NonNullable<Rules> = {
  cycleDays: 3,
  firstEnd: null,
  crimesOff: ['dj', 'movie'],
  custom: [{ title: 'Dishes duty', description: '', unit: 'dish', sticker: 'dish', chore: 'them' }],
};

async function setUp(r: Rules) {
  const a = await user();
  const { link } = await pairing.createPair(a, {
    name: 'Maya',
    species: 'cat',
    timezone: 'Asia/Jerusalem',
    rules: r,
  });
  return { a, token: link.replace('/j/', '') };
}

describe('the setup wizard’s rules (spec §4)', () => {
  it('shows the proposed rules on the join page, from the joiner’s side', async () => {
    const { token } = await setUp(rules);
    const { rules: shown } = await pairing.previewInvite(await user(), token);
    expect(shown).toMatchObject({
      cycleDays: 3,
      firstEnd: null,
      chores: [{ title: 'Dishes duty', owner: 'you' }],
    });
    expect(shown.crimes).toHaveLength(CRIME_KEYS.length - 2 + 1);
    expect(shown.crimes.map((c) => c.title)).not.toContain('Car DJ Crimes');
  });

  it('starts a 3-day cycle at the join, hands over the chore, and keeps turned-off crimes out', async () => {
    const { a, token } = await setUp(rules);
    const b = await user();
    await pairing.acceptInvite(b, token, { name: 'Alex', species: 'bear' });
    const tab = await charges.tab(b);
    expect(tab.deadline).toEqual({ end: '2026-10-15T17:00:00.000Z', label: 'Thu 20:00' });
    expect(tab).toMatchObject({ cycleDays: 3, crimesOff: ['dj', 'movie'] });
    expect(tab.custom[0]!.chore).toEqual({ owner: 'me', doneToday: false });
    expect(await code(charges.file(a, { crimeKey: 'dj' }))).toBe('not_allowed');
    expect(await code(charges.file(a, { crimeKey: 'sip' }))).toBe('ok');

    // It seals at Thursday 20:00 and the next cycle runs three more days.
    const { pairId } = await pairing.inPair(a);
    now = at('2026-10-15T17:00:00Z');
    expect(await verdicts.sealDue(now, { pairId })).toBe(1);
    expect((await charges.tab(a)).deadline.end).toBe('2026-10-18T17:00:00.000Z');
  });

  it('keeps the creator’s first deadline if still an hour away at the join, else uses the cycle', async () => {
    const kept = await setUp({ ...rules, firstEnd: '2026-10-13T18:00:00Z' });
    const b = await user();
    await pairing.acceptInvite(b, kept.token, { name: 'Alex', species: 'bear' });
    expect((await charges.tab(b)).deadline.end).toBe('2026-10-13T18:00:00.000Z');

    const stale = await setUp({ ...rules, firstEnd: '2026-10-13T18:00:00Z' });
    now = at('2026-10-13T17:30:00Z');
    const c = await user();
    await pairing.acceptInvite(c, stale.token, { name: 'Alex', species: 'bear' });
    expect((await charges.tab(c)).deadline.end).toBe('2026-10-16T17:00:00.000Z'); // Friday 20:00, 3 days on
  });

  it('refuses a first deadline too soon at creation, and keeps today’s defaults without rules', async () => {
    expect(await code(setUp({ ...rules, firstEnd: '2026-10-12T10:30:00Z' }))).toBe('too_soon');
    const { token } = await setUp(undefined);
    const b = await user();
    await pairing.acceptInvite(b, token, { name: 'Alex', species: 'bear' });
    expect(await charges.tab(b)).toMatchObject({
      cycleDays: null,
      crimesOff: [],
      deadline: { end: '2026-10-18T17:00:00.000Z' },
    });
  });
});
