import { describe, expect, it } from 'vitest';
import { ropePosition } from './score.ts';
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
