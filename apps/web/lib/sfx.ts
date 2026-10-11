// UI sounds, synthesised with Web Audio (design.md §8), recipes from the prototype's `sfx`.
// Silent until the first user gesture, and whenever sound is switched off.

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let unlocked = false;
let soundOn = true;

if (typeof window !== 'undefined') {
  const unlock = (): void => {
    unlocked = true;
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

export function setSound(on: boolean): void {
  soundOn = on;
}

function audio(): { ctx: AudioContext; out: AudioNode } | null {
  if (!soundOn || !unlocked || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    const gain = ctx.createGain();
    gain.gain.value = 0.45;
    comp.connect(gain).connect(ctx.destination);
    master = comp;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  gain: number,
  at = 0,
  type: OscillatorType = 'sine',
): void {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noise(dur: number, f0: number, f1: number, gain: number, at = 0, q = 1): void {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const buf = a.ctx.createBuffer(1, Math.floor(a.ctx.sampleRate * dur), a.ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, t);
  filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(a.out);
  src.start(t);
}

const knock = (at = 0): void => {
  noise(0.04, 900, 700, 0.5, at, 2);
  tone(230, 140, 0.07, 0.6, at);
};

export const sfx = {
  tap: (): void => tone(520, 430, 0.05, 0.14),
  pop: (): void => {
    tone(660, 660, 0.07, 0.14);
    tone(990, 990, 0.16, 0.12, 0.07);
  },
  knock,
  gavel: (): void => {
    knock(0);
    knock(0.22);
  },
  stamp: (): void => {
    tone(150, 50, 0.2, 0.7);
    noise(0.06, 800, 300, 0.4, 0, 0.7);
  },
  paper: (): void => noise(0.2, 3200, 1300, 0.12, 0, 1.2),
  thump: (at = 0): void => {
    tone(140, 70, 0.12, 0.45, at);
    noise(0.05, 400, 200, 0.25, at, 0.8);
  },
  chime: (): void => {
    tone(1319, 1319, 0.5, 0.1);
    tone(1760, 1760, 0.6, 0.09, 0.08);
    tone(2637, 2637, 0.7, 0.05, 0.16);
  },
};
