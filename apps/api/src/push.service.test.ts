import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PUSH_BATCH_MS, UNDO_MS, type CrimeKey } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService, type ChargePushJob } from './push.service.js';
import { VerdictsService } from './verdicts.service.js';

// Real database, injected clock, no workers. `notify` is captured instead of queued; deliver() runs with a
// fake sender. sealDue() and remind() sweep every pair, so assertions look at the test's own members.
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

const at = (iso: string): Date => new Date(iso);
const later = (ms: number): void => {
  now = new Date(now.getTime() + ms);
};
beforeEach(() => {
  now = at('2026-10-12T10:00:00Z');
  sent = [];
});

/** Maya (a) starts a tab in Jerusalem; Alex (b) joins. `ma`/`mb` are their member ids. */
async function pair() {
  const [a, b] = await Promise.all([prisma.user.create({ data: {} }), prisma.user.create({ data: {} })]);
  const { link } = await pairing.createPair(a.id, {
    name: 'Maya',
    species: 'cat',
    timezone: 'Asia/Jerusalem',
  });
  await pairing.acceptInvite(b.id, link.replace('/j/', ''), { name: 'Alex', species: 'bear' });
  const [ma, mb] = (await pairing.inPair(a.id)).pair.members.map((m) => m.id) as [string, string];
  return { a: a.id, b: b.id, ma, mb };
}
const file = async (user: string, crimeKey: CrimeKey = 'trash'): Promise<string> =>
  (await charges.file(user, { crimeKey })).id;
const to = (memberId: string): string[] => sent.filter((s) => s.memberId === memberId).map((s) => s.body);

describe('the events of spec §12', () => {
  it('tells the inviter who joined, the filer about pleas, the accused about decisions', async () => {
    const { a, b, ma, mb } = await pair();
    expect(to(ma)).toEqual(['Alex joined as the Blanket Bear.']);

    const appealed = await file(a, 'trash');
    await charges.plead(b, appealed, { plea: 'appeal' });
    await charges.decide(a, appealed, { decision: 'uphold' });
    const second = await file(a, 'sip');
    await charges.plead(b, second, { plea: 'appeal' });
    await charges.decide(a, second, { decision: 'drop' });
    await charges.plead(b, await file(a, 'trash'), { plea: 'guilty' });

    expect(to(ma).slice(1)).toEqual([
      'Alex cries foul: Trash Jenga. Your call.',
      'Alex cries foul: The Phantom Sip. Your call.',
      'Alex owned it.',
    ]);
    expect(to(mb)).toEqual(['Maya says nice try. It counts.', 'Maya let it slide.']);
  });

  it('sends nothing when 24 hours of silence make a charge guilty', async () => {
    const { a, ma } = await pair();
    await file(a);
    sent = [];
    later(24 * 60 * 60 * 1000);
    await charges.autoGuilty();
    expect(to(ma)).toEqual([]);
  });

  it('tells the winner and the loser apart when the week seals, and both on a tie', async () => {
    const won = await pair();
    await file(won.a);
    const tie = await pair();
    sent = [];
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    expect(to(won.ma)).toEqual(['You won the week. Gloat responsibly.']);
    expect(to(won.mb)).toEqual(['The verdict is in.']);
    expect(to(tie.ma)).toEqual(['Dead even this week. Suspiciously wholesome.']);
    expect(to(tie.mb)).toEqual(['Dead even this week. Suspiciously wholesome.']);
    await verdicts.sealDue();
    expect(to(won.ma)).toHaveLength(1);
  });
});

describe('the held charge push (spec §8, §12)', () => {
  const run = (job: ChargePushJob): Promise<void> => push.chargePush(job);
  const deferred = async (accusedId: string) =>
    (await jobs.boss.findJobs<ChargePushJob>(QUEUES.chargePush, { data: { accusedId } })).length;

  it('sends the first charge alone and batches the next ones within 2 minutes', async () => {
    const { a, mb } = await pair();
    const start = now.getTime();
    const one = await file(a, 'trash');
    later(UNDO_MS);
    await run({ chargeId: one });
    expect(to(mb)).toEqual(['Maya filed: Trash Jenga.']);

    now = new Date(start + 30_000);
    const two = await file(a, 'sip');
    later(UNDO_MS);
    await run({ chargeId: two });
    now = new Date(start + 90_000);
    const three = await file(a, 'burrito');
    later(UNDO_MS);
    await run({ chargeId: three });
    expect(to(mb)).toHaveLength(1);
    expect(await deferred(mb)).toBe(2);

    now = new Date(start + UNDO_MS + PUSH_BATCH_MS);
    await run({ accusedId: mb });
    await run({ accusedId: mb });
    expect(to(mb)).toEqual([
      'Maya filed: Trash Jenga.',
      'Maya filed 2 charges: The Phantom Sip and The Blanket Burrito.',
    ]);
  });

  it('sends nothing for a charge undone inside 10 seconds, or one already pleaded to', async () => {
    const { a, b, mb } = await pair();
    const undone = await file(a);
    await charges.undo(a, undone);
    const pleaded = await file(a);
    await charges.plead(b, pleaded, { plea: 'guilty' });
    later(UNDO_MS);
    await run({ chargeId: undone });
    await run({ chargeId: pleaded });
    expect(to(mb)).toEqual([]);
  });
});

describe('delivery', () => {
  it('sends to every device of the member and forgets the gone ones', async () => {
    const { a, b, ma } = await pair();
    const keys = { p256dh: 'BNc', auth: 'tBH' };
    const id = crypto.randomUUID();
    const live = `https://fcm.googleapis.com/fcm/send/${id}`;
    const gone = `https://web.push.apple.com/${id}`;
    await push.subscribe(a, { endpoint: live, keys });
    await push.subscribe(a, { endpoint: gone, keys });
    const delivered: [string, string][] = [];
    const fake = new PushService(prisma, clock, jobs);
    fake.send = async (sub, payload) => {
      if (sub.endpoint === gone) throw Object.assign(new Error('Gone'), { statusCode: 410 });
      delivered.push([sub.endpoint, payload]);
    };
    await fake.deliver({ memberId: ma, body: 'Alex owned it.' });
    expect(delivered).toEqual([
      [live, JSON.stringify({ title: 'Petty Tab', body: 'Alex owned it.', url: '/' })],
    ]);
    expect(await prisma.pushSub.count({ where: { endpoint: gone } })).toBe(0);

    // A device that changes hands moves over; unsubscribing only removes your own.
    await push.subscribe(b, { endpoint: live, keys });
    expect((await prisma.pushSub.findUniqueOrThrow({ where: { endpoint: live } })).userId).toBe(b);
    await push.unsubscribe(a, live);
    expect(await prisma.pushSub.count({ where: { endpoint: live } })).toBe(1);
    await push.unsubscribe(b, live);
    expect(await prisma.pushSub.count({ where: { endpoint: live } })).toBe(0);
  });
});

describe('the sentence reminder (spec §12: Wednesday 19:00 local)', () => {
  it('reminds the loser once each Wednesday until the sentence is served', async () => {
    const { a, b, mb } = await pair();
    await file(a);
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    const { id, sentence } = await verdicts.view(a, 'latest');
    sent = [];

    now = at('2026-10-21T15:59:00Z');
    await verdicts.remind();
    expect(to(mb)).toEqual([]);
    now = at('2026-10-21T16:00:00Z');
    await Promise.all([verdicts.remind(), verdicts.remind()]);
    now = at('2026-10-21T16:15:00Z');
    await verdicts.remind();
    expect(to(mb)).toHaveLength(1);
    expect(to(mb)[0]).toMatch(/^You still owe Maya: .+\.$/);
    expect(sentence).not.toBeNull();

    now = at('2026-10-28T17:00:00Z');
    await verdicts.remind();
    expect(to(mb)).toHaveLength(2);

    await verdicts.served(b, id);
    now = at('2026-11-04T17:00:00Z');
    await verdicts.remind();
    expect(to(mb)).toHaveLength(2);
  });
});
