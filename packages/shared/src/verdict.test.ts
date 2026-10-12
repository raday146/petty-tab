import { describe, expect, it } from 'vitest';
import type { ChargeStatus, CrimeKey } from './catalog.ts';
import { SENTENCE_KEYS } from './catalog.ts';
import { judge, seedSentence, sentenceLocked } from './verdict.ts';

const MAYA = 'maya';
const ALEX = 'alex';
let minute = 0;
const charge = (filerId: string, crime: CrimeKey, status: ChargeStatus = 'guilty') => ({
  filerId,
  crime,
  status,
  createdAt: new Date(Date.UTC(2026, 9, 12, 0, minute++)),
});

describe('judge (spec §10)', () => {
  it('finds the member with fewer points guilty, winner first', () => {
    const v = judge([charge(MAYA, 'sip'), charge(MAYA, 'trash'), charge(ALEX, 'clock')], [ALEX, MAYA]);
    expect(v).toMatchObject({ tie: false, winnerId: MAYA, loserId: ALEX, points: [2, 1] });
  });

  it('calls equal points a tie, in join order', () => {
    const v = judge([charge(MAYA, 'sip'), charge(ALEX, 'clock')], [ALEX, MAYA]);
    expect(v).toMatchObject({ tie: true, winnerId: ALEX, loserId: MAYA, points: [1, 1], topCrimes: [] });
    expect(judge([], [MAYA, ALEX])).toMatchObject({ tie: true, points: [0, 0] });
  });

  it('counts pending as guilty and appealed as dropped (the statuses sealing persists)', () => {
    const v = judge(
      [charge(MAYA, 'sip', 'pending'), charge(ALEX, 'clock', 'appealed'), charge(ALEX, 'dish', 'dropped')],
      [MAYA, ALEX],
    );
    expect(v).toMatchObject({ tie: false, winnerId: MAYA, points: [1, 0] });
  });

  it('keeps the top three crimes against the loser, ties broken by the most recent charge', () => {
    const v = judge(
      [
        charge(MAYA, 'burrito'),
        charge(MAYA, 'clock'),
        charge(MAYA, 'burrito'),
        charge(MAYA, 'dj'),
        charge(MAYA, 'dish'),
        charge(MAYA, 'roll', 'dropped'),
        charge(MAYA, 'roll', 'dropped'),
        charge(ALEX, 'sip'),
        charge(ALEX, 'sip'),
      ],
      [MAYA, ALEX],
    );
    // Crime keys, never sticker keys: `dj` draws as `tape` only in the drawing code.
    expect(v.topCrimes).toEqual([
      { crime: 'burrito', count: 2 },
      { crime: 'dish', count: 1 },
      { crime: 'dj', count: 1 },
    ]);
  });
});

describe('seedSentence', () => {
  it('is the same for the same verdict id and spreads across the catalog', () => {
    const id = '019a1f2e-7c3b-7d4e-9f00-123456789abc';
    expect(seedSentence(id)).toBe(seedSentence(id));
    const picks = new Set(Array.from({ length: 200 }, (_, i) => seedSentence(`${id}${i}`)));
    expect([...picks].sort()).toEqual([...SENTENCE_KEYS].sort());
  });
});

describe('sentenceLocked (spec §10)', () => {
  const deadline = new Date('2026-10-19T17:00:00Z');
  it('locks at the first winner share or at Monday 20:00, whichever comes first', () => {
    expect(sentenceLocked(null, deadline, new Date('2026-10-19T16:59:59Z'))).toBe(false);
    expect(sentenceLocked(null, deadline, deadline)).toBe(true);
    expect(sentenceLocked(new Date('2026-10-18T18:00:00Z'), deadline, new Date('2026-10-18T19:00:00Z'))).toBe(
      true,
    );
  });
});
