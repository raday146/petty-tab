// UI sounds, synthesised with Web Audio (design.md §8), recipes from the prototype's `sfx`.
// Silent until the first user gesture, and whenever sound is switched off (settings or the story's mute,
// remembered on this device).

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let unlocked = false;
const KEY = 'pt-sound';
let soundOn = true;

/**
 * How iOS mixes our sounds with other audio (Safari 17+). 'transient' ducks music instead of stopping it.
 * Calibration knob from the phone test: 'playback' also plays with the silent switch on, but pauses music.
 */
const AUDIO_SESSION = 'transient';

/**
 * iOS only starts audio inside a gesture: create and resume the context in the tap itself, with a silent
 * buffer, rather than later in a timeout (the stamp lands 180 ms after the tap). Every gesture checks again,
 * because iOS suspends or interrupts the context (a call, the app in the background).
 */
function wake(): void {
  unlocked = true;
  const a = audio();
  if (!a || a.ctx.state === 'running') return;
  const silent = a.ctx.createBufferSource();
  silent.buffer = a.ctx.createBuffer(1, 1, 22050);
  silent.connect(a.ctx.destination);
  silent.start(0);
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(type, wake, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state !== 'running') void ctx.resume();
  });
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = AUDIO_SESSION;
  try {
    soundOn = localStorage.getItem(KEY) !== 'off';
  } catch {
    // Storage blocked: sound stays on for this visit.
  }
}

export function soundIsOn(): boolean {
  return soundOn;
}

export function setSound(on: boolean): void {
  soundOn = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
}

function audio(): { ctx: AudioContext; out: AudioNode } | null {
  if (!soundOn || !unlocked || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    comp.connect(gain).connect(ctx.destination);
    master = comp;
  }
  // 'interrupted' is iOS's state after a call or a trip to the background.
  if (ctx.state !== 'running') void ctx.resume();
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

/** A short vibration where the platform has one (Android; iOS Safari has none). Quiet when sound is off. */
export function buzz(ms: number): void {
  if (soundOn) navigator.vibrate?.(ms);
}

const knock = (at = 0): void => {
  noise(0.04, 900, 700, 0.5, at, 2);
  tone(230, 140, 0.07, 0.6, at);
};

export const sfx = {
  tap: (): void => tone(520, 430, 0.05, 0.14),
  pop: (): void => {
    tone(660, 660, 0.07, 0.22);
    tone(990, 990, 0.16, 0.2, 0.07);
  },
  /** The score bump: a quick two-note rise. */
  bump: (): void => {
    tone(523, 523, 0.09, 0.3);
    tone(784, 784, 0.16, 0.3, 0.08);
    buzz(15);
  },
  knock,
  gavel: (): void => {
    knock(0);
    knock(0.22);
  },
  stamp: (): void => {
    tone(150, 50, 0.24, 1);
    noise(0.08, 800, 300, 0.7, 0, 0.7);
    buzz(35);
  },
  paper: (): void => noise(0.2, 3200, 1300, 0.12, 0, 1.2),
  thump: (at = 0): void => {
    tone(140, 70, 0.12, 0.45, at);
    noise(0.05, 400, 200, 0.25, at, 0.8);
  },
  chime: (): void => {
    tone(1319, 1319, 0.5, 0.24);
    tone(1760, 1760, 0.6, 0.2, 0.08);
    tone(2637, 2637, 0.7, 0.12, 0.16);
  },
};
