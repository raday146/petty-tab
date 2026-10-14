import { bookFor } from './catalog.ts';
import { describe, expect, it } from 'vitest';
import { ropePosition, tally } from './score.ts';
import type { ChargeStatus, CrimeKey } from './catalog.ts';
import { unitLabel } from './catalog.ts';

describe('ropePosition (spec §9)', () => {
  it.each([
    [2, 36],
    [-2, 64],
    [7, 10],
    [-7, 90],
    [0, 50],
  ])('lead %i puts the marker at %i%% from my side', (lead, percent) => {
    expect(ropePosition(lead)).toBe(percent);
  });
});

describe('unitLabel', () => {
  it('counts with singular and plural forms', () => {
    expect(unitLabel('coffee', 1)).toBe('1 coffee');
    expect(unitLabel('coffee', 4)).toBe('4 coffees');
    expect(unitLabel('dish', 2)).toBe('2 dish loads');
    expect(unitLabel('foot', 1)).toBe('1 foot rub');
  });

  it('labels a single charge as +1', () => {
    expect(unitLabel('dish')).toBe('+1 dish load');
  });
});

describe('tally (spec §9 worked examples)', () => {
  const MAYA = 'maya';
  const ALEX = 'alex';
  const c = (filerId: string, crime: CrimeKey, status: ChargeStatus) => ({ filerId, crime, status });

  it('3 – 1: counts guilty, pending and upheld, not appealed', () => {
    const t = tally(
      [
        c(MAYA, 'sip', 'guilty'),
        c(MAYA, 'sip', 'pending'),
        c(MAYA, 'trash', 'upheld'),
        c(MAYA, 'movie', 'appealed'),
        c(ALEX, 'clock', 'guilty'),
      ],
      MAYA,
    );
    expect(t).toEqual({
      me: 3,
      them: 1,
      lead: 2,
      meOwed: [
        { unit: 'coffee', count: 2 },
        { unit: 'dish', count: 1 },
      ],
      themOwed: [{ unit: 'coffee', count: 1 }],
    });
    expect(ropePosition(t.lead)).toBe(36);
  });

  it('0 – 2: dropped counts for nothing; owed keeps filing order', () => {
    const t = tally([c(MAYA, 'dish', 'dropped'), c(ALEX, 'dj', 'guilty'), c(ALEX, 'roll', 'pending')], MAYA);
    expect(t).toEqual({
      me: 0,
      them: 2,
      lead: -2,
      meOwed: [],
      themOwed: [
        { unit: 'foot', count: 1 },
        { unit: 'dish', count: 1 },
      ],
    });
    expect(ropePosition(t.lead)).toBe(64);
  });

  it('7 – 0: the rope offset clamps at 40', () => {
    const t = tally(
      Array.from({ length: 7 }, () => c(MAYA, 'sip', 'guilty')),
      MAYA,
    );
    expect([t.me, t.them, t.lead]).toEqual([7, 0, 7]);
    expect(ropePosition(t.lead)).toBe(10);
  });

  it('2 – 2: dead even', () => {
    const t = tally(
      [
        c(MAYA, 'sip', 'guilty'),
        c(ALEX, 'pan', 'upheld'),
        c(MAYA, 'roll', 'pending'),
        c(ALEX, 'dj', 'guilty'),
      ],
      MAYA,
    );
    expect([t.me, t.them, t.lead]).toEqual([2, 2, 0]);
    expect(ropePosition(t.lead)).toBe(50);
  });

  it('is the same tab from the other side', () => {
    const charges = [c(MAYA, 'sip', 'guilty'), c(ALEX, 'clock', 'guilty'), c(ALEX, 'dj', 'pending')];
    expect(tally(charges, ALEX)).toMatchObject({ me: 2, them: 1, lead: 1 });
  });
});

describe('tally with custom crimes', () => {
  it('counts a custom crime in the unit its creator picked', () => {
    const book = bookFor([
      { id: 'tp', title: 'Toilet paper roulette', description: '', sticker: 'roll', unit: 'foot' },
    ]);
    expect(tally([{ filerId: 'maya', crime: 'custom:tp', status: 'guilty' }], 'maya', book).meOwed).toEqual([
      { unit: 'foot', count: 1 },
    ]);
  });
});
