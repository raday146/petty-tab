import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderKey, type CrimeKey, type RenderJob } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import type { Clock } from './clock.js';
import { Events } from './events.js';
import { Jobs, QUEUES } from './jobs.js';
import { verifyFile } from './crypto.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { VerdictsService } from './verdicts.service.js';

// Real database, injected clock. Every test makes its own pair; workers are not registered, so the sealer
// is called directly. sealDue() seals every pair in the database, so assertions look at the test's own pair.
const prisma = new PrismaService();
const jobs = new Jobs();
beforeAll(() => jobs.start());
afterAll(() => Promise.all([prisma.$disconnect(), jobs.onModuleDestroy()]));

let now: Date;
const clock = { now: () => now } as Clock;
const events = new Events();
const pairing = new PairingService(prisma, clock, events);
const charges = new ChargesService(prisma, clock, pairing, jobs, events);
const verdicts = new VerdictsService(prisma, clock, pairing, jobs, events);

const at = (iso: string): Date => new Date(iso);
const plus = (t: Date, s: number): Date => new Date(t.getTime() + s * 1000);
const code = (p: Promise<unknown>): Promise<unknown> =>
  p.then(
    () => 'ok',
    (e: { getResponse?: () => { error: { code: string } } }) => e.getResponse?.().error.code ?? e,
  );

/** Maya (a) starts a tab in `timezone` an hour before Alex (b) joins at `joined`. */
async function pair(timezone: string, joined: Date) {
  now = plus(joined, -3600);
  const [a, b] = await Promise.all([prisma.user.create({ data: {} }), prisma.user.create({ data: {} })]);
  const { link } = await pairing.createPair(a.id, { name: 'Maya', species: 'cat', timezone });
  now = joined;
  await pairing.acceptInvite(b.id, link.replace('/j/', ''), { name: 'Alex', species: 'bear' });
  const pairId = (await pairing.inPair(a.id)).pairId;
  return { a: a.id, b: b.id, pairId };
}
const file = async (user: string, crimeKey: CrimeKey = 'trash'): Promise<string> =>
  (await charges.file(user, { crimeKey })).id;
const ofPair = (pairId: string) =>
  prisma.verdict.findMany({ where: { pairId }, orderBy: { weekStart: 'asc' } });

describe('sealing at Sunday 20:00 local (spec §10), time travel', () => {
  const cases = [
    ['Asia/Jerusalem', '2026-10-12T10:00:00Z', '2026-10-18T17:00:00Z', '2026-10-25T18:00:00Z'],
    ['America/New_York', '2026-10-19T12:00:00Z', '2026-10-26T00:00:00Z', '2026-11-02T01:00:00Z'],
    ['Pacific/Auckland', '2026-09-14T00:00:00Z', '2026-09-20T08:00:00Z', '2026-09-27T07:00:00Z'],
  ] as const;

  for (const [zone, joinedIso, firstEndIso, dstEndIso] of cases) {
    it(`${zone}: seals the first week and the DST week at their Sunday 20:00, then starts at 0–0`, async () => {
      const firstEnd = at(firstEndIso);
      const dstEnd = at(dstEndIso);
      const { a, b, pairId } = await pair(zone, at(joinedIso));
      await file(a, 'sip');

      now = plus(firstEnd, -1);
      await verdicts.sealDue();
      expect(await ofPair(pairId)).toEqual([]);

      now = firstEnd;
      await verdicts.sealDue();
      expect(await ofPair(pairId)).toMatchObject([
        { weekStart: at(joinedIso), weekEnd: firstEnd, isTie: false },
      ]);
      expect(await charges.tab(b)).toMatchObject({ lead: 0, charges: [], hasVerdict: true });

      await file(b, 'clock');
      await file(b, 'dish');
      now = plus(dstEnd, -1);
      await verdicts.sealDue();
      expect(await ofPair(pairId)).toHaveLength(1);

      now = dstEnd;
      await verdicts.sealDue();
      const [, second] = await ofPair(pairId);
      expect(second).toMatchObject({ weekStart: firstEnd, weekEnd: dstEnd, isTie: false });
      expect((await verdicts.view(b, 'latest')).viewer).toBe('winner');
    });
  }

  it('catches up on every missed week, oldest first', async () => {
    const { pairId } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    now = at('2026-11-02T00:00:00Z');
    await verdicts.sealDue();
    expect((await ofPair(pairId)).map((v) => v.weekEnd)).toEqual([
      at('2026-10-18T17:00:00Z'),
      at('2026-10-25T18:00:00Z'),
      at('2026-11-01T18:00:00Z'),
    ]);
  });
});

describe('idempotent sealing', () => {
  it('produces one verdict when sealed twice, even at the same moment', async () => {
    const { a, pairId } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    await file(a);
    now = at('2026-10-18T17:05:00Z');
    await Promise.all([verdicts.sealDue(), verdicts.sealDue()]);
    await verdicts.sealDue();
    expect(await ofPair(pairId)).toHaveLength(1);
  });
});

describe('week_closed (spec §8)', () => {
  it('refuses undo, plea and appeal decisions after week_end, before the sealer runs', async () => {
    const { a, b } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    const appealed = await file(a, 'sip');
    await charges.plead(b, appealed, { plea: 'appeal' });
    now = at('2026-10-18T16:59:55Z');
    const fresh = await file(a, 'trash');

    now = at('2026-10-18T17:00:01Z');
    expect(await code(charges.undo(a, fresh))).toBe('week_closed');
    expect(await code(charges.plead(b, fresh, { plea: 'guilty' }))).toBe('week_closed');
    expect(await code(charges.decide(a, appealed, { decision: 'uphold' }))).toBe('week_closed');
  });
});

describe('the sealed week (spec §10)', () => {
  it('persists pending as guilty and unresolved appeals as dropped, resolved at week_end', async () => {
    const { a, b, pairId } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    const pending = await file(a, 'sip');
    const appealed = await file(b, 'clock');
    await charges.plead(a, appealed, { plea: 'appeal' });
    // auto-guilty is not run here, so the sealer is what settles the pending charge.
    const weekEnd = at('2026-10-18T17:00:00Z');
    now = weekEnd;
    await verdicts.sealDue();

    const rows = await prisma.charge.findMany({ where: { pairId }, orderBy: { createdAt: 'asc' } });
    expect(rows.map((c) => [c.id, c.status])).toEqual([
      [pending, 'guilty'],
      [appealed, 'dropped'],
    ]);
    expect(rows[1]!.resolvedAt).toEqual(weekEnd);
    // Maya 1 (the pending sip) – Alex 0 (the dropped appeal): Alex is guilty.
    expect(await verdicts.view(b, 'latest')).toMatchObject({
      viewer: 'loser',
      winner: { name: 'Maya', species: 'cat' },
      loser: { name: 'Alex', species: 'bear' },
      tie: false,
      topCrimes: [{ crime: 'sip', count: 1 }],
      locked: false,
    });
  });

  it('calls a tie "Dead even": no sentence, members in join order', async () => {
    const { a, b } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    await file(b, 'sip');
    await file(a, 'clock');
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    const v = await verdicts.view(b, 'latest');
    expect(v).toMatchObject({ tie: true, sentence: null, winner: { name: 'Maya' }, loser: { name: 'Alex' } });
    expect(await code(verdicts.setSentence(a, v.id, { sentenceKey: 'netflix' }))).toBe('not_allowed');
    expect((await charges.tab(a)).unconfirmed).toEqual([]);
  });

  it('keeps the snapshot when a member renames later', async () => {
    const { a, b } = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    await file(a);
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    await pairing.updateMember(b, { name: 'Al' });
    expect((await verdicts.view(a, 'latest')).loser.name).toBe('Alex');
  });
});

describe('the sentence (spec §10)', () => {
  async function sealed() {
    const p = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    await file(p.a);
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    const { id, sentence } = await verdicts.view(p.a, 'latest');
    return { ...p, id, sentence };
  }

  it("locks at the winner's first share; the loser's share does not lock it", async () => {
    const { a, b, id, sentence } = await sealed();
    expect(sentence).not.toBeNull();
    await verdicts.shared(b, id);
    expect((await verdicts.view(a, id)).locked).toBe(false);
    await verdicts.setSentence(a, id, { sentenceKey: 'netflix' });
    expect(await code(verdicts.setSentence(b, id, { sentenceKey: 'fitted' }))).toBe('not_allowed');

    await verdicts.shared(a, id);
    expect(await verdicts.view(b, id)).toMatchObject({ locked: true, sentence: 'netflix' });
    expect(await code(verdicts.setSentence(a, id, { sentenceKey: 'fitted' }))).toBe('sentence_locked');
    const row = await prisma.verdict.findUniqueOrThrow({ where: { id } });
    await verdicts.shared(a, id);
    expect(await prisma.verdict.findUniqueOrThrow({ where: { id } })).toEqual(row);
  });

  it('locks at Monday 20:00 local without a share', async () => {
    const { a, id } = await sealed();
    now = at('2026-10-19T16:59:59Z');
    await verdicts.setSentence(a, id, { sentenceKey: 'breakfast' });
    now = at('2026-10-19T17:00:00Z');
    expect(await code(verdicts.setSentence(a, id, { sentenceKey: 'netflix' }))).toBe('sentence_locked');
  });

  it('is served by the loser, confirmed by the winner, and owed on the tab until then', async () => {
    const { a, b, id } = await sealed();
    const sentence = (await verdicts.view(a, id)).sentence;
    expect((await charges.tab(b)).unconfirmed).toEqual([{ winner: 'Maya', loser: 'Alex', sentence }]);

    expect(await code(verdicts.confirm(a, id))).toBe('not_allowed');
    expect(await code(verdicts.served(a, id))).toBe('not_allowed');
    await verdicts.served(b, id);
    expect(await code(verdicts.confirm(b, id))).toBe('not_allowed');
    await verdicts.confirm(a, id);
    expect(await verdicts.view(b, id)).toMatchObject({ served: true, confirmed: true });
    expect((await charges.tab(a)).unconfirmed).toEqual([]);
  });

  it('only shows verdicts of the caller’s pair', async () => {
    const { id } = await sealed();
    const other = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    expect(await code(verdicts.view(other.a, id))).toBe('not_allowed');
    expect(await code(verdicts.view(other.a, 'not-a-uuid'))).toBe('not_allowed');
  });
});

describe('renders (spec §11)', () => {
  async function sealed(tie = false) {
    const p = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    await file(p.a, 'burrito');
    if (tie) await file(p.b, 'sip');
    now = at('2026-10-18T17:00:00Z');
    await verdicts.sealDue();
    const { id, sentence } = await verdicts.view(p.a, 'latest');
    return { ...p, id, sentence };
  }
  const queued = async (key: string) =>
    (await jobs.boss.findJobs<RenderJob>(QUEUES.render, { key })).map((j) => j.data);

  it('queues a card and a reel when a week seals, drawn from the snapshot', async () => {
    const { id, sentence } = await sealed();
    const card = renderKey(id, 'card', sentence);
    expect(await queued(card)).toEqual([
      {
        verdictId: id,
        kind: 'card',
        key: card,
        input: {
          winner: { name: 'Maya', species: 'cat' },
          loser: { name: 'Alex', species: 'bear' },
          tie: false,
          topCrimes: [{ crime: 'burrito', count: 1 }],
          sentence,
        },
      },
    ]);
    expect(await queued(renderKey(id, 'reel', sentence))).toHaveLength(1);
  });

  it('queues only a card on a tie (no reel)', async () => {
    const { id } = await sealed(true);
    expect(await queued(renderKey(id, 'card', null))).toHaveLength(1);
    expect(await queued(renderKey(id, 'reel', null))).toHaveLength(0);
  });

  it('serves a render once it lands, through a short-lived signed URL; 404 before and to other pairs', async () => {
    const { a, b, id, sentence } = await sealed();
    expect(await code(verdicts.file(a, id, 'card'))).toBe('not_rendered');
    const emit = vi.spyOn(events, 'emit');
    await verdicts.rendered({ verdictId: id, kind: 'card', key: renderKey(id, 'card', sentence) });
    expect(emit).toHaveBeenCalledWith(expect.any(String), 'verdict.updated');
    expect(await verdicts.view(b, id)).toMatchObject({ card: true, reel: false });

    const url = new URL(await verdicts.file(b, id, 'card'), 'http://x');
    const key = url.pathname.replace('/api/files/', '');
    const [exp, sig] = [Number(url.searchParams.get('exp')), url.searchParams.get('sig')!];
    expect(key).toBe(renderKey(id, 'card', sentence));
    expect(verifyFile(key, exp, sig, now)).toBe(true);
    expect(verifyFile(key, exp, sig, plus(now, 301))).toBe(false);
    expect(verifyFile(renderKey(id, 'reel', sentence), exp, sig, now)).toBe(false);
    expect(verifyFile(key, exp + 1, sig, now)).toBe(false);

    const other = await pair('Asia/Jerusalem', at('2026-10-12T10:00:00Z'));
    expect(await code(verdicts.file(other.a, id, 'card'))).toBe('not_allowed');
  });

  it('re-renders on a new sentence and ignores a render of the old one', async () => {
    const { a, id, sentence } = await sealed();
    await verdicts.rendered({ verdictId: id, kind: 'reel', key: renderKey(id, 'reel', sentence) });
    const next = sentence === 'breakfast' ? 'netflix' : 'breakfast';
    await verdicts.setSentence(a, id, { sentenceKey: next });
    expect(await verdicts.view(a, id)).toMatchObject({ reel: false });
    expect(await queued(renderKey(id, 'reel', next))).toHaveLength(1);

    await verdicts.rendered({ verdictId: id, kind: 'card', key: renderKey(id, 'card', sentence) });
    expect(await verdicts.view(a, id)).toMatchObject({ card: false });
  });
});
