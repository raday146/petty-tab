import { rng } from '@petty-tab/shared';
import { DURATION } from './timeline.ts';

/** The reel's sound (reel.md §7). Recipes take any BaseAudioContext, so the live preview and the
 *  OfflineAudioContext export share one cue table. Noise is seeded, so two exports are identical. */

export const SAMPLE_RATE = 48_000;

interface Out {
  ctx: BaseAudioContext;
  out: AudioNode;
}

/** A compressor into a 0.45 master gain into the destination. */
export function master(ctx: BaseAudioContext): Out {
  const comp = ctx.createDynamicsCompressor();
  const gain = ctx.createGain();
  gain.gain.value = 0.45;
  comp.connect(gain).connect(ctx.destination);
  return { ctx, out: comp };
}

function tone(
  a: Out,
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  at: number,
): void {
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(a.out);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

let noiseSeed = 1;

function noise(a: Out, dur: number, f0: number, f1: number, gain: number, at: number, q: number): void {
  const buf = a.ctx.createBuffer(1, Math.floor(a.ctx.sampleRate * dur), a.ctx.sampleRate);
  const ch = buf.getChannelData(0);
  const r = rng(noiseSeed++);
  for (let i = 0; i < ch.length; i++) ch[i] = r() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, at);
  filter.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(a.out);
  src.start(at);
}

const chip = (a: Out, f: number, dur: number, at: number, g = 0.1): void => {
  tone(a, f, f, dur, 'square', g, at);
  tone(a, f / 2, f / 2, dur, 'triangle', g * 0.9, at);
};

const thump = (a: Out, at: number): void => {
  tone(a, 140, 70, 0.12, 'sine', 0.45, at);
  noise(a, 0.05, 400, 200, 0.25, at, 0.8);
};

/** A sine glide with a vibrato LFO on its frequency (slide whistle and boing). */
function wobble(
  a: Out,
  at: number,
  o: {
    f0: number;
    f1: number;
    glide: number;
    lfo: number;
    depth: [number, number];
    env: (g: AudioParam) => void;
  },
): void {
  const osc = a.ctx.createOscillator();
  const lfo = a.ctx.createOscillator();
  const depth = a.ctx.createGain();
  const g = a.ctx.createGain();
  osc.frequency.setValueAtTime(o.f0, at);
  osc.frequency.exponentialRampToValueAtTime(o.f1, at + o.glide);
  lfo.frequency.value = o.lfo;
  depth.gain.setValueAtTime(o.depth[0], at);
  if (o.depth[1] !== o.depth[0]) depth.gain.exponentialRampToValueAtTime(o.depth[1], at + o.glide);
  lfo.connect(depth).connect(osc.frequency);
  o.env(g.gain);
  osc.connect(g).connect(a.out);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + 0.6);
  lfo.stop(at + 0.6);
}

const NOTE = { G4: 392, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5 };

/** reel.md §7, in order. `at` is the context time the cue lands on. */
export const CUES: readonly { t: number; play: (a: Out, at: number) => void }[] = [
  { t: 0.3, play: (a, at) => tone(a, 74, 46, 0.16, 'sine', 0.5, at) },
  { t: 0.52, play: (a, at) => tone(a, 66, 42, 0.14, 'sine', 0.32, at) },
  { t: 1.02, play: (a, at) => tone(a, 74, 46, 0.16, 'sine', 0.55, at) },
  { t: 1.24, play: (a, at) => tone(a, 66, 42, 0.14, 'sine', 0.36, at) },
  { t: 1.38, play: (a, at) => noise(a, 0.24, 300, 2400, 0.07, at, 0.8) },
  {
    t: 1.6,
    play: (a, at) => {
      noise(a, 0.04, 900, 700, 0.5, at, 2);
      tone(a, 230, 140, 0.07, 'sine', 0.6, at);
      tone(a, 96, 30, 0.7, 'sine', 0.95, at + 0.02);
      noise(a, 0.32, 240, 60, 0.6, at + 0.02, 0.6);
      noise(a, 0.05, 2600, 900, 0.25, at + 0.02, 1.4);
    },
  },
  {
    t: 2.55,
    play: (a, at) => {
      chip(a, NOTE.G4, 0.09, at);
      chip(a, NOTE.C5, 0.09, at + 0.1);
      chip(a, NOTE.E5, 0.09, at + 0.2);
      chip(a, NOTE.G5, 0.17, at + 0.3);
      chip(a, NOTE.E5, 0.09, at + 0.5);
      chip(a, NOTE.G5, 0.4, at + 0.6, 0.12);
    },
  },
  {
    t: 3.3,
    play: (a, at) =>
      wobble(a, at, {
        f0: 1700,
        f1: 330,
        glide: 0.4,
        lfo: 9,
        depth: [18, 18],
        env: (g) => {
          g.setValueAtTime(0.0001, at);
          g.exponentialRampToValueAtTime(0.22, at + 0.03);
          g.setValueAtTime(0.22, at + 0.34);
          g.exponentialRampToValueAtTime(0.0001, at + 0.42);
        },
      }),
  },
  {
    t: 3.72,
    play: (a, at) => {
      wobble(a, at, {
        f0: 240,
        f1: 120,
        glide: 0.5,
        lfo: 21,
        depth: [110, 4],
        env: (g) => {
          g.setValueAtTime(0.0001, at);
          g.exponentialRampToValueAtTime(0.5, at + 0.01);
          g.exponentialRampToValueAtTime(0.0001, at + 0.55);
        },
      });
      thump(a, at);
    },
  },
  { t: 3.86, play: thump },
  { t: 3.98, play: (a, at) => tone(a, 520, 300, 0.07, 'triangle', 0.2, at) },
  { t: 4.08, play: (a, at) => tone(a, 600, 340, 0.07, 'triangle', 0.2, at) },
  { t: 4.18, play: (a, at) => tone(a, 690, 380, 0.07, 'triangle', 0.2, at) },
  {
    t: 4.28,
    play: (a, at) => {
      thump(a, at);
      tone(a, 2300, 2100, 0.12, 'triangle', 0.12, at);
      tone(a, 3100, 2900, 0.1, 'triangle', 0.07, at + 0.03);
    },
  },
  {
    t: 4.5,
    play: (a, at) => {
      noise(a, 0.18, 4200, 1500, 0.28, at, 0.7);
      chip(a, NOTE.C5, 0.5, at, 0.07);
      chip(a, NOTE.E5, 0.5, at, 0.06);
      chip(a, NOTE.G5, 0.5, at, 0.06);
      chip(a, NOTE.C6, 0.6, at + 0.04, 0.07);
    },
  },
  {
    t: 4.9,
    play: (a, at) => {
      tone(a, 150, 60, 0.16, 'sine', 0.5, at);
      noise(a, 0.05, 700, 300, 0.2, at, 0.8);
    },
  },
];

/** The whole soundtrack, rendered offline at 48 kHz stereo, as a 16-bit WAV. */
export async function renderWav(): Promise<ArrayBuffer> {
  noiseSeed = 1;
  const ctx = new OfflineAudioContext(2, DURATION * SAMPLE_RATE, SAMPLE_RATE);
  const a = master(ctx);
  for (const cue of CUES) cue.play(a, cue.t);
  return wav(await ctx.startRendering());
}

function wav(buf: AudioBuffer): ArrayBuffer {
  const channels = buf.numberOfChannels;
  const frames = buf.length;
  const out = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const text = (at: number, s: string): void =>
    [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  out.setUint32(4, 36 + frames * channels * 2, true);
  text(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, channels, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * channels * 2, true);
  out.setUint16(32, channels * 2, true);
  out.setUint16(34, 16, true);
  text(36, 'data');
  out.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buf.getChannelData(c));
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c]![i]!));
      out.setInt16(44 + (i * channels + c) * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
  return out.buffer;
}
