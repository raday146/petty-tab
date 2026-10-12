import { expect, it } from 'vitest';
import { rng } from './rng.ts';

it('is reproducible, seed-dependent and in [0, 1)', () => {
  const take = (seed: number): number[] => Array.from({ length: 5 }, rng(seed));
  expect(take(7)).toEqual(take(7));
  expect(take(7)).not.toEqual(take(21));
  // Value of the prototype's own rng(7)(), so particle layouts match the approved reel.
  expect(rng(7)()).toBe(0.011704753153026104);
  for (const v of take(21)) expect(v >= 0 && v < 1).toBe(true);
});
