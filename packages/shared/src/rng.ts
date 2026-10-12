/**
 * mulberry32, the seeded RNG from the prototype (reel.md §6). Same seed, same sequence: renders of one verdict
 * are identical, and the pre-selected sentence can be seeded by the verdict id (spec §10).
 */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
