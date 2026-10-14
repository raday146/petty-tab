import { describe, expect, it } from 'vitest';
import { breakdown } from './breakdown.ts';
import { bookFor } from './catalog.ts';
import type { ChargeStatus } from './catalog.ts';

const ME = { id: 'maya', name: 'Maya' };
const THEM = { id: 'alex', name: 'Alex' };
const book = bookFor([
  { id: 'tp', title: 'Toilet paper roulette', description: '', sticker: 'roll', unit: 'dish' },
]);
const c = (filerId: string, crime: string, status: ChargeStatus = 'guilty') => ({
  filerId,
  crime,
  status,
});
const verdict = (end: string, winnerId: string | null, points: [number, number], top?: string) => ({
  id: end,
  weekEnd: new Date(end),
  winnerId,
  snapshot: {
    winner: { name: winnerId === 'alex' ? 'Alex' : 'Maya', points: points[0] },
    loser: { name: winnerId === 'alex' ? 'Maya' : 'Alex', points: points[1] },
    topCrimes: top ? [{ crime: top, count: 1 }] : [],
  },
});

describe('breakdown (the Breakdown screen)', () => {
  const view = breakdown({
    me: ME,
    them: THEM,
    week: [
      c('maya', 'sip'),
      c('maya', 'sip'),
      c('maya', 'sip'),
      c('maya', 'custom:tp'),
      c('alex', 'dish', 'dropped'),
    ],
    allCharges: [
      c('maya', 'sip'),
      c('maya', 'sip'),
      c('alex', 'dish'),
      c('alex', 'dish'),
      c('alex', 'trash'),
    ],
    chores: [
      { title: 'Dishes duty', ownerId: 'alex', done: 4, neglected: 1 },
      { title: 'Plants', ownerId: 'maya', done: 2, neglected: 0 },
    ],
    verdicts: [
      verdict('2026-10-04T17:00:00Z', 'alex', [3, 1], 'trash'),
      verdict('2026-10-11T17:00:00Z', 'maya', [4, 2], 'sip'),
      verdict('2026-10-18T17:00:00Z', 'maya', [2, 0], 'custom:tp'),
      verdict('2026-10-25T18:00:00Z', null, [1, 1]),
    ],
    book,
  });

  it('lists what each person did this week, by crime, counting only what counts', () => {
    expect(view.week.them.crimes).toEqual([
      { title: 'The Phantom Sip', sticker: 'sip', count: 3 },
      { title: 'Toilet paper roulette', sticker: 'roll', count: 1 },
    ]);
    expect(view.week.them.total).toBe(4);
    expect(view.week.me).toMatchObject({ crimes: [], total: 0, slid: 1 });
  });

  it('has a playful line for each side, naming the person', () => {
    expect(view.week.them.quip).toEqual({
      name: 'Alex',
      text: 'has 3 × The Phantom Sip. The fridge remembers.',
    });
    expect(view.week.me.quip).toEqual({ name: 'Maya', text: 'kept it clean this week. Suspicious.' });
  });

  it('counts chores done and neglected, from the viewer’s side', () => {
    expect(view.chores).toEqual([
      { title: 'Dishes duty', owner: 'them', done: 4, neglected: 1 },
      { title: 'Plants', owner: 'me', done: 2, neglected: 0 },
    ]);
  });

  it('lists past verdicts newest first, with the top crime’s title', () => {
    expect(view.history.map((h) => [h.winner, h.points, h.top])).toEqual([
      [null, [1, 1], null],
      ['Maya', [2, 0], 'Toilet paper roulette'],
      ['Maya', [4, 2], 'The Phantom Sip'],
      ['Alex', [3, 1], 'Trash Jenga'],
    ]);
  });

  it('keeps all-time wins, the streak before the tie, and each person’s most-charged crime', () => {
    expect(view.allTime).toMatchObject({
      wins: { me: 2, them: 1 },
      ties: 1,
      streak: null,
      worst: { me: 'Dishwasher Terrorism', them: 'The Phantom Sip' },
    });
    expect(view.allTime.quip).toEqual({ name: 'Maya', text: 'leads 2–1 all-time.' });
  });

  it('names a streak of two or more straight wins', () => {
    const v = breakdown({
      me: ME,
      them: THEM,
      week: [],
      allCharges: [],
      chores: [],
      verdicts: [
        verdict('2026-10-11T17:00:00Z', 'alex', [1, 0]),
        verdict('2026-10-18T17:00:00Z', 'alex', [2, 0]),
      ],
      book,
    });
    expect(v.allTime.streak).toEqual({ who: 'them', weeks: 2 });
    expect(v.allTime.quip).toEqual({ name: 'Alex', text: 'is on a 2-week streak. Someone call a referee.' });
    expect(v.history).toHaveLength(2);
  });
});
