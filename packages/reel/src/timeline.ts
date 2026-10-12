import { rng } from '@petty-tab/shared';

/** The reel timeline from docs/reel.md as pure functions of t (seconds). Same t, same frame. */

export const DURATION = 6;
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type Ease = 'lin' | 'io' | 'out' | 'inn' | 'back' | 'bounce';
export type Key = readonly [time: number, value: number, ease?: Ease];
export type Keys = readonly Key[] | ((t: number) => number);

export const EZ: Record<Ease, (p: number) => number> = {
  lin: (p) => p,
  io: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  out: (p) => 1 - (1 - p) ** 3,
  inn: (p) => p * p * p,
  back: (p) => 1 + 2.9 * (p - 1) ** 3 + 1.9 * (p - 1) ** 2,
  bounce: (p) => {
    const n = 7.5625;
    const d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  },
};

/** reel.md §4: the easing applies to the segment ending at a key; a key without one uses `io`. */
export function kf(keys: Keys, t: number): number {
  if (typeof keys === 'function') return keys(t);
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i]!;
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!;
      return v0 + (v1 - v0) * EZ[ease ?? 'io']((t - t0) / (t1 - t0 || 1));
    }
  }
  return keys[keys.length - 1]![1];
}

const BEATS = [
  [0.3, 1],
  [0.52, 0.6],
  [1.02, 1],
  [1.24, 0.6],
] as const;

/** The cold open's double heartbeat. */
export function hb(t: number): number {
  let v = 0;
  for (const [beat, w] of BEATS) {
    const d = t - beat;
    if (d >= 0 && d < 0.24) v += w * (1 - d / 0.24) ** 2;
  }
  return v;
}

const SHAKES = [
  [1.62, 36, 0.5],
  [3.72, 12, 0.26],
  [3.86, 7, 0.2],
  [4.28, 8, 0.22],
] as const;

/** reel.md §6: the whole stage's offset in px. */
export function shakeAt(t: number): [number, number] {
  let x = 0;
  let y = 0;
  SHAKES.forEach(([t0, amp, len], i) => {
    const d = t - t0;
    if (d < 0 || d >= len) return;
    const a = amp * (1 - d / len) ** 2;
    x += a * Math.sin(d * 74 + i);
    y += a * Math.cos(d * 97 + i * 2) * 0.8;
  });
  return [x, y];
}

/** A piece of the pile dropping in (y in units). */
export const fall = (t0: number, d: number): Key[] => [
  [t0, -250],
  [t0 + d, 0, 'inn'],
  [t0 + d + 0.06, -5, 'out'],
  [t0 + d + 0.12, 0, 'inn'],
];

/** Hidden, then shown at t0. */
const on = (t0: number): Key[] => [
  [t0 - 0.01, 0],
  [t0, 1],
];

/** x, y in stage px (times `unit`), r in degrees, s/sx/sy scale, o opacity; origin in stage px of the layer box. */
export interface Track {
  o?: Keys;
  x?: Keys;
  y?: Keys;
  r?: Keys;
  s?: Keys;
  sx?: Keys;
  sy?: Keys;
  origin?: string;
  unit?: number;
}

/** The part of `art.scenes.story().geometry` the tracks pivot on (story units). */
export interface Geometry {
  winnerX: number;
  winnerY: number;
  loserX: number;
  floor: number;
  tokenPositions: readonly (readonly [number, number, number])[];
}

const px = (x: number, y: number): string => `${x * 4}px ${y * 4}px`;

/** Every animated layer of the stage (reel.md §3) with its tracks (reel.md §5). */
export function tracks(g: Geometry) {
  const winnerOrigin = px(g.winnerX, g.winnerY + 76);
  const loserOrigin = px(g.loserX, g.floor);
  const tokenOrigin = (i: number): string => {
    const [x, y] = g.tokenPositions[i]!;
    return px(x, y);
  };
  const slide: Key[] = [
    [2.5, -230],
    [2.96, 26, 'back'],
    [3.3, 26],
    [3.64, 0, 'io'],
  ];
  const winner = {
    x: slide,
    y: [
      [2.9, 0],
      [3, -3.5, 'out'],
      [3.1, 0, 'inn'],
    ],
    r: [
      [3.08, 0],
      [3.2, -3.5, 'out'],
      [3.42, -3.5],
      [3.52, 0],
    ],
    origin: winnerOrigin,
    unit: 4,
  } satisfies Track;

  return {
    cold: {
      o: [
        [0, 0],
        [0.22, 1],
        [1.6, 1],
        [1.66, 0],
      ],
    },
    coldText: { s: (t) => 1 + 0.055 * hb(t) },
    seal: {
      s: (t) => 1 + 0.13 * hb(t),
      r: [
        [0, -10],
        [1.5, -4, 'lin'],
      ],
    },
    glow: { o: (t) => 0.22 + 0.7 * hb(t), s: (t) => 1 + 0.1 * hb(t) },
    dot1: {
      o: [
        [0.6, 0],
        [0.66, 1],
      ],
    },
    dot2: {
      o: [
        [0.84, 0],
        [0.9, 1],
      ],
    },
    dot3: {
      o: [
        [1.08, 0],
        [1.14, 1],
      ],
    },
    wipe: {
      s: [
        [1.6, 0],
        [1.92, 13, 'out'],
      ],
    },
    flash: {
      o: [
        [1.6, 0],
        [1.63, 0.9],
        [1.9, 0, 'out'],
      ],
    },
    stamp: {
      o: [
        [1.5, 0],
        [1.56, 1],
      ],
      s: [
        [1.5, 4.6],
        [1.62, 1, 'inn'],
        [1.68, 0.92, 'out'],
        [1.78, 1, 'out'],
        [2.35, 1],
        [2.72, 0.42, 'io'],
      ],
      r: [
        [1.5, -17],
        [1.62, -8, 'inn'],
        [2.35, -8],
        [2.72, 7, 'io'],
      ],
      x: [
        [2.35, 0],
        [2.72, 262, 'io'],
      ],
      y: [
        [2.35, 0],
        [2.72, -372, 'io'],
      ],
      origin: '50% 50%',
    },
    band: {
      o: [
        [2.3, 0],
        [2.32, 1],
      ],
      sy: [
        [2.3, 0],
        [2.58, 1, 'out'],
      ],
      origin: '50% 50%',
    },
    title: {
      o: [
        [2.42, 0],
        [2.66, 1],
      ],
      y: [
        [2.42, -46],
        [2.74, 0, 'back'],
      ],
    },
    floor: {
      o: [
        [2.4, 0],
        [2.6, 1],
      ],
    },
    sofa: { o: on(2.5), x: slide, unit: 4 },
    winner: {
      ...winner,
      o: [
        [2.49, 0],
        [2.5, 1],
        [3.09, 1],
        [3.1, 0],
        [3.46, 0],
        [3.47, 1],
      ],
    },
    winnerWink: {
      ...winner,
      o: [
        [3.09, 0],
        [3.1, 1],
        [3.46, 1],
        [3.47, 0],
      ],
    },
    sparkles: {
      o: [
        [3.02, 0],
        [3.14, 1],
      ],
    },
    loserIn: {
      o: [
        [3.29, 0],
        [3.3, 1],
        [3.72, 1],
        [3.73, 0],
      ],
      x: [
        [3.3, 96],
        [3.64, 0, 'out'],
      ],
      r: [
        [3.3, 9],
        [3.4, -7],
        [3.5, 6],
        [3.6, -3],
        [3.66, 0],
      ],
      origin: loserOrigin,
      unit: 4,
    },
    loserBuried: {
      o: on(3.73),
      sy: [
        [3.72, 0.7],
        [3.82, 1.07, 'out'],
        [3.9, 0.9],
        [4, 1.03],
        [4.1, 0.95],
        [4.28, 0.98],
        [4.36, 1],
      ],
      sx: [
        [3.72, 1.14],
        [3.82, 0.96, 'out'],
        [3.9, 1.05],
        [4, 0.99],
        [4.2, 1],
      ],
      origin: loserOrigin,
    },
    basket: { o: on(3.5), y: fall(3.5, 0.22), unit: 4 },
    laundry: { o: on(3.66), y: fall(3.66, 0.2), unit: 4 },
    token0: {
      o: on(3.8),
      y: fall(3.8, 0.18),
      r: [
        [3.8, -40],
        [3.98, 0, 'lin'],
      ],
      origin: tokenOrigin(0),
      unit: 4,
    },
    token1: {
      o: on(3.9),
      y: fall(3.9, 0.18),
      r: [
        [3.9, 50],
        [4.08, 0, 'lin'],
      ],
      origin: tokenOrigin(1),
      unit: 4,
    },
    token2: {
      o: on(4),
      y: fall(4, 0.18),
      r: [
        [4, -30],
        [4.18, 0, 'lin'],
      ],
      origin: tokenOrigin(2),
      unit: 4,
    },
    plates: { o: on(4.1), y: fall(4.1, 0.18), unit: 4 },
    orbit: {
      o: [
        [3.74, 0],
        [3.82, 1],
      ],
    },
    lead: {
      o: [
        [4.5, 0],
        [4.7, 1],
      ],
      y: [
        [4.5, 34],
        [4.76, 0, 'out'],
      ],
    },
    sentence: {
      o: [
        [4.55, 0],
        [4.62, 1],
      ],
      y: [
        [4.55, -300],
        [4.93, 0, 'bounce'],
      ],
      s: [
        [4.55, 1.2],
        [4.9, 1, 'out'],
      ],
      origin: '50% 50%',
    },
    watermark: {
      o: [
        [4.95, 0],
        [5.25, 1],
      ],
    },
  } satisfies Record<string, Track>;
}

export type Layer = keyof ReturnType<typeof tracks>;

/** The story preview's mention tag (reel.md §5): part of the viewer frame, never exported. */
export const TAG: Track = {
  o: [
    [3.7, 0],
    [3.84, 1],
  ],
  s: [
    [3.7, 0.6],
    [3.9, 1, 'back'],
  ],
  r: () => -4,
  origin: '50% 50%',
};

/** The inline style a track gives its layer at t. */
export function style(
  k: Track,
  t: number,
): { transform?: string; opacity?: string; transformOrigin?: string } {
  const out: { transform?: string; opacity?: string; transformOrigin?: string } = {};
  const u = k.unit ?? 1;
  if (k.x || k.y || k.r || k.s || k.sx || k.sy) {
    const s = k.s ? kf(k.s, t) : 1;
    const x = (k.x ? kf(k.x, t) : 0) * u;
    const y = (k.y ? kf(k.y, t) : 0) * u;
    const r = k.r ? kf(k.r, t) : 0;
    const sx = s * (k.sx ? kf(k.sx, t) : 1);
    const sy = s * (k.sy ? kf(k.sy, t) : 1);
    out.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  }
  if (k.origin) out.transformOrigin = k.origin;
  if (k.o) out.opacity = kf(k.o, t).toFixed(3);
  return out;
}

export interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r0: number;
  fleck: boolean;
}
export interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  fl: number;
  c: string;
}

// The draw order of the prototype's rng calls matters: it is the seed's sequence.
export const DUST: Dust[] = (() => {
  const r = rng(7);
  return Array.from({ length: 30 }, () => {
    const a = r() * Math.PI * 2;
    const x = 540 + Math.cos(a) * (330 + r() * 130);
    const y = 900 + Math.sin(a) * (110 + r() * 70);
    const vx = Math.cos(a) * (260 + r() * 420);
    const vy = Math.sin(a) * (160 + r() * 300) - 90;
    const r0 = 16 + r() * 26;
    return { x, y, vx, vy, r0, fleck: r() < 0.3 };
  });
})();

const CONFETTI_COLOURS = ['#e9b440', '#c8402a', '#1b2440', '#e9b440', '#4a63b0', '#f3b8ad'];

export const CONFETTI: Confetti[] = (() => {
  const r = rng(21);
  return Array.from({ length: 110 }, (_, i) => {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.5;
    const sp = 900 + r() * 1700;
    const x = 540 + (r() - 0.5) * 160;
    return {
      x,
      y: 1010,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      w: 18 + r() * 16,
      h: r() < 0.35 ? 16 : 34 + r() * 14,
      rot: r() * 6,
      vr: (r() - 0.5) * 14,
      fl: r() * 6,
      c: CONFETTI_COLOURS[i % 6]!,
    };
  });
})();

/** Draws dust and confetti for t on a canvas whose context is already scaled to 1080×1920 stage px. */
export function drawFx(c: CanvasRenderingContext2D, t: number): void {
  c.clearRect(0, 0, WIDTH, HEIGHT);
  let d = t - 1.62;
  if (d >= 0 && d < 0.75) {
    const k = d / 0.75;
    const e = 1 - (1 - k) ** 2.4;
    for (const p of DUST) {
      c.globalAlpha = (p.fleck ? 0.9 : 0.5) * (1 - k);
      c.fillStyle = p.fleck ? '#c8402a' : '#cdbf9f';
      c.beginPath();
      c.arc(
        p.x + p.vx * e * 0.55,
        p.y + p.vy * e * 0.55 + (p.fleck ? 520 * d * d : 0),
        p.fleck ? 7 + p.r0 * 0.12 : p.r0 * (0.5 + e * 1.5),
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  d = t - 4.5;
  if (d >= 0 && d < 1.5) {
    c.globalAlpha = d > 1.25 ? (1.5 - d) / 0.25 : 1;
    for (const p of CONFETTI) {
      const x = p.x + p.vx * d * (1 - d * 0.22);
      const y = p.y + p.vy * d + 1500 * d * d;
      if (y > 1980) continue;
      c.save();
      c.translate(x, y);
      c.rotate(p.rot + p.vr * d);
      c.scale(1, Math.cos(p.fl + d * 9));
      c.fillStyle = p.c;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    }
  }
  c.globalAlpha = 1;
}
