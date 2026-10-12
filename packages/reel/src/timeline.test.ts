import { describe, expect, it } from 'vitest';
import { CONFETTI, DUST, EZ, fall, hb, kf, shakeAt, style, tracks, type Geometry } from './timeline.ts';

// The geometry art.scenes.story() returns for a cat winner and a bear loser (reel.md §3).
const geometry: Geometry = {
  winnerX: 109,
  winnerY: 74,
  loserX: 200,
  floor: 222,
  tokenPositions: [
    [162, 178, -12],
    [240, 182, 10],
    [203, 101, 5],
  ],
};
const T = tracks(geometry);

describe('easing and keyframes (reel.md §4)', () => {
  it('every easing runs 0 → 1', () => {
    for (const ease of Object.values(EZ)) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
    }
  });

  it('a key without an easing uses cubic in-out, not linear', () => {
    expect(kf([[0, 0], [1, 1]], 0.25)).toBeCloseTo(EZ.io(0.25));
    expect(kf([[0, 0], [1, 1, 'lin']], 0.25)).toBeCloseTo(0.25);
  });

  it('holds the first value before the first key and the last after the last', () => {
    const keys = [[1, 5], [2, 9, 'lin']] as const;
    expect(kf([...keys], 0)).toBe(5);
    expect(kf([...keys], 3)).toBe(9);
  });

  it('back overshoots', () => {
    expect(Math.max(...[0.6, 0.7, 0.8].map(EZ.back))).toBeGreaterThan(1);
  });
});

describe('tracks (reel.md §5)', () => {
  it('the stamp slams to scale 1 at 1.62 and ends in the corner at 0.42', () => {
    expect(kf(T.stamp.s!, 1.5)).toBe(4.6);
    expect(kf(T.stamp.s!, 1.62)).toBeCloseTo(1);
    expect(kf(T.stamp.s!, 3)).toBeCloseTo(0.42);
    expect(kf(T.stamp.x!, 3)).toBe(262);
    expect(kf(T.stamp.y!, 3)).toBe(-372);
  });

  it('the cold open fades in and cuts out at 1.66', () => {
    expect(kf(T.cold.o!, 0)).toBe(0);
    expect(kf(T.cold.o!, 1)).toBe(1);
    expect(kf(T.cold.o!, 1.7)).toBe(0);
  });

  it('the wink swaps in for 3.10–3.46 and the plain winner hides for the same span', () => {
    for (const [t, wink] of [
      [3.05, 0],
      [3.2, 1],
      [3.45, 1],
      [3.5, 0],
    ] as const) {
      expect(kf(T.winnerWink.o!, t)).toBeCloseTo(wink);
      expect(kf(T.winner.o!, t)).toBeCloseTo(1 - wink);
    }
  });

  it('pivots the winner at (436, 600), the loser at (800, 888) and token 1 on its own position', () => {
    expect(T.winner.origin).toBe('436px 600px');
    expect(T.winnerWink.origin).toBe('436px 600px');
    expect(T.loserBuried.origin).toBe('800px 888px');
    expect(T.token0.origin).toBe('648px 712px');
  });

  it('fall drops from −250 units, lands, bounces to −5 and settles', () => {
    const keys = fall(3.5, 0.22);
    expect(kf(keys, 3.5)).toBe(-250);
    expect(kf(keys, 3.72)).toBeCloseTo(0);
    expect(kf(keys, 3.78)).toBeCloseTo(-5);
    expect(kf(keys, 4)).toBe(0);
  });

  it('style() writes units ×4 and an opacity', () => {
    const st = style(T.sofa, 2.5);
    expect(st.transform).toContain('translate(-920.00px,0.00px)');
    expect(st.opacity).toBe('1.000');
  });
});

describe('heartbeat, shake and particles (reel.md §5–6)', () => {
  it('beats peak at 0.30, 0.52, 1.02, 1.24 and are silent elsewhere', () => {
    expect(hb(0.3)).toBeCloseTo(1);
    expect(hb(0.52)).toBeCloseTo(0.6 + (1 - 0.22 / 0.24) ** 2);
    expect(hb(0.1)).toBe(0);
    expect(hb(2)).toBe(0);
  });

  it('shakes only inside the four windows', () => {
    expect(shakeAt(1.0)).toEqual([0, 0]);
    expect(shakeAt(1.7)[0]).not.toBe(0);
    expect(shakeAt(2.2)).toEqual([0, 0]);
    expect(shakeAt(3.8)[1]).not.toBe(0);
  });

  it('particles are seeded: 30 dust, 110 confetti, the same every time', () => {
    expect(DUST).toHaveLength(30);
    expect(CONFETTI).toHaveLength(110);
    expect(DUST.filter((p) => p.fleck).length).toBeGreaterThan(0);
    expect(DUST[0]).toMatchInlineSnapshot();
  });
});
