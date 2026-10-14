import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { createArt, type Species, type StickerKey } from '@petty-tab/art';
import { SENTENCES, topCrimeInfo, type RenderInput } from '@petty-tab/shared';
import { CUES, master } from './audio.ts';
import {
  DURATION,
  HEIGHT,
  WIDTH,
  drawFx,
  shakeAt,
  style,
  tracks,
  type Layer,
  type Track,
} from './timeline.ts';

/** What one verdict's reel shows (reel.md §1). Names are user text: they only ever go into React text nodes. */
export interface ReelInput {
  winner: { name: string; species: Species };
  loser: { name: string; species: Species };
  sentence: string;
  /** Up to three sticker keys (not crime keys). */
  tokens: StickerKey[];
}

export interface ReelHandle {
  seek(t: number): void;
  play(): void;
  pause(): void;
  readonly playing: boolean;
  readonly t: number;
}

interface Props {
  input: ReelInput;
  ref?: Ref<ReelHandle>;
  /** Stage scale: 1 for the 1080×1920 export, 390/1080 in the story preview. */
  scale?: number;
  /** Full-resolution particles (the export); the preview draws them at half resolution. */
  hires?: boolean;
  /** Plays the cues while playing. Only turn on after a user gesture. */
  sound?: boolean;
  /** Called on every applied frame (the story frame's progress bar and mention tag follow it). */
  onFrame?: (t: number) => void;
}

const abs = (s: CSSProperties): CSSProperties => ({ position: 'absolute', ...s });
const SCENE: CSSProperties = abs({ left: 0, top: 0, width: 1080, height: 912, opacity: 0 });

/** The stage of reel.md §3, driven only by t: `seek(t)` always shows the same frame. */
export function Reel({ input, ref, scale = 1, hires = false, sound = false, onFrame }: Props): ReactNode {
  const prefix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const story = useMemo(
    () =>
      createArt({ idPrefix: prefix }).scenes.story({
        winner: input.winner.species,
        loser: input.loser.species,
        tokens: input.tokens,
      }),
    [prefix, input.winner.species, input.loser.species, input.tokens],
  );
  const seal = useMemo(() => createArt({ idPrefix: `${prefix}s` }).scenes.seal(), [prefix]);
  const T = useMemo(() => tracks(story.geometry), [story]);
  const world = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const clock = useRef({ t: 0, playing: false, raf: 0, last: 0 });
  const audio = useRef<ReturnType<typeof master> | null>(null);
  const soundOn = useRef(sound);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    soundOn.current = sound;
    onFrameRef.current = onFrame;
  });

  const apply = (t: number): void => {
    for (const el of stage.current?.querySelectorAll<HTMLElement>('[data-layer]') ?? [])
      Object.assign(el.style, style(T[el.dataset.layer as Layer] as Track, t));
    const [x, y] = shakeAt(t);
    if (world.current) world.current.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    const c = fx.current?.getContext('2d');
    if (c) {
      c.setTransform(hires ? 1 : 0.5, 0, 0, hires ? 1 : 0.5, 0, 0);
      drawFx(c, t);
    }
    // The art's own loops (dizzy spirals, orbiting stars) follow t too, so a frame never depends on wall time.
    for (const a of stage.current?.getAnimations({ subtree: true }) ?? []) {
      a.pause();
      a.currentTime = t * 1000;
    }
    onFrameRef.current?.(t);
  };

  const fire = (from: number, to: number): void => {
    if (!soundOn.current || typeof AudioContext === 'undefined') return;
    audio.current ??= master(new AudioContext());
    const a = audio.current;
    if (a.ctx instanceof AudioContext && a.ctx.state === 'suspended') void a.ctx.resume();
    for (const cue of CUES) if (cue.t >= from && cue.t < to) cue.play(a, a.ctx.currentTime);
  };

  const tick = (now: number): void => {
    const c = clock.current;
    const dt = Math.min(0.06, (now - c.last) / 1000);
    c.last = now;
    const from = c.t;
    c.t += dt;
    if (c.t >= DURATION) {
      fire(from, DURATION);
      c.t -= DURATION;
      fire(0, c.t);
    } else fire(from, c.t);
    apply(c.t);
    c.raf = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    seek(t) {
      clock.current.t = Math.max(0, Math.min(DURATION - 0.001, t));
      apply(clock.current.t);
    },
    play() {
      const c = clock.current;
      if (c.playing) return;
      c.playing = true;
      c.last = performance.now();
      c.raf = requestAnimationFrame(tick);
    },
    pause() {
      clock.current.playing = false;
      cancelAnimationFrame(clock.current.raf);
    },
    get playing() {
      return clock.current.playing;
    },
    get t() {
      return clock.current.t;
    },
  }));

  useEffect(() => {
    apply(clock.current.t);
    const c = clock.current;
    return () => cancelAnimationFrame(c.raf);
    // Re-apply when the art changes; apply reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  useEffect(() => () => void (audio.current?.ctx as AudioContext | undefined)?.close(), []);

  const { winner, loser } = input;
  const len = winner.name.length + loser.name.length;
  const svg = (layer: Layer, html: string): ReactNode => (
    <div data-layer={layer} style={SCENE} data-fill dangerouslySetInnerHTML={{ __html: html }} />
  );

  return (
    <div
      ref={stage}
      style={{
        position: 'relative',
        width: WIDTH,
        height: HEIGHT,
        overflow: 'hidden',
        background: 'var(--ink)',
        color: 'var(--ink)',
        fontFamily: 'var(--sans)',
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: '0 0',
      }}
      aria-hidden
    >
      <style>{'[data-fill]>svg{width:100%;height:100%}'}</style>
      <div ref={world} style={abs({ inset: 0 })}>
        <div
          data-layer="cold"
          style={abs({
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 64,
            paddingBottom: 60,
            textAlign: 'center',
            color: 'var(--paper)',
            opacity: 0,
          })}
        >
          <div
            data-layer="glow"
            style={abs({
              left: 90,
              top: 450,
              width: 900,
              height: 900,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--crimson) 60%, transparent), transparent 66%)',
            })}
          />
          <div
            data-layer="seal"
            style={{ position: 'relative', width: 260, height: 260 }}
            data-fill
            dangerouslySetInnerHTML={{ __html: seal }}
          />
          <h3
            data-layer="coldText"
            style={{
              position: 'relative',
              margin: 0,
              fontWeight: 800,
              fontSize: 124,
              lineHeight: 1.04,
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
            }}
          >
            The verdict
            <br />
            is sealed
            {(['dot1', 'dot2', 'dot3'] as const).map((d) => (
              <span key={d} data-layer={d} style={{ opacity: 0 }}>
                .
              </span>
            ))}
          </h3>
        </div>
        <div
          data-layer="wipe"
          style={abs({
            left: 440,
            top: 800,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'var(--paper)',
            transform: 'scale(0)',
          })}
        />
        <div
          data-layer="band"
          style={abs({
            left: 0,
            top: 420,
            width: 1080,
            height: 912,
            background: 'var(--butter)',
            opacity: 0,
          })}
        />
        <h3
          data-layer="title"
          style={abs({
            left: 40,
            right: 40,
            top: 262,
            margin: 0,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: len > 18 ? 66 : len > 12 ? 84 : 108,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            opacity: 0,
          })}
        >
          <bdi>{winner.name}</bdi> vs. <bdi>{loser.name}</bdi>
        </h3>
        <div style={abs({ left: 0, top: 420, width: 1080, height: 912, overflow: 'hidden' })}>
          {svg('floor', story.floor)}
          {svg('sofa', story.sofa)}
          {svg('winner', story.winner)}
          {svg('winnerWink', story.winnerWink)}
          {svg('sparkles', story.sparkles)}
          {svg('loserIn', story.loserIn)}
          {svg('loserBuried', story.loserBuried)}
          {svg('basket', story.basket)}
          {svg('laundry', story.laundry)}
          {svg('token0', story.tokens[0] ?? '')}
          {svg('token1', story.tokens[1] ?? '')}
          {svg('token2', story.tokens[2] ?? '')}
          {svg('plates', story.plates)}
          {svg('orbit', story.orbit)}
        </div>
        <div
          data-layer="stamp"
          style={abs({
            left: 100,
            top: 750,
            width: 880,
            height: 300,
            display: 'grid',
            placeItems: 'center',
            paddingLeft: '0.1em',
            fontWeight: 800,
            fontSize: 190,
            lineHeight: 1,
            letterSpacing: '0.1em',
            color: 'var(--crimson)',
            border: '18px solid var(--crimson)',
            borderRadius: 46,
            opacity: 0,
          })}
        >
          GUILTY
          <span
            style={abs({
              inset: 14,
              border: '5px solid var(--crimson)',
              borderRadius: 26,
              opacity: 0.55,
            })}
          />
        </div>
        <div style={abs({ left: 60, right: 60, top: 1378, textAlign: 'center' })}>
          <p
            data-layer="lead"
            style={{ margin: 0, fontSize: 58, lineHeight: 1.2, color: 'var(--mute)', opacity: 0 }}
          >
            <bdi style={{ fontWeight: 600, color: 'var(--ink)' }}>{loser.name}</bdi> owes{' '}
            <bdi style={{ fontWeight: 600, color: 'var(--ink)' }}>{winner.name}</bdi>
          </p>
          <b
            data-layer="sentence"
            style={{
              display: 'block',
              marginTop: 22,
              fontWeight: 800,
              fontSize: 104,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              textWrap: 'balance',
              opacity: 0,
            }}
          >
            {input.sentence}
          </b>
        </div>
        <div
          data-layer="watermark"
          style={abs({
            left: 0,
            right: 0,
            top: 1796,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 46,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            wordSpacing: '0.1em',
            color: 'var(--mute)',
            opacity: 0,
          })}
        >
          petty tab
        </div>
      </div>
      <canvas
        ref={fx}
        width={hires ? WIDTH : WIDTH / 2}
        height={hires ? HEIGHT : HEIGHT / 2}
        style={abs({ left: 0, top: 0, width: WIDTH, height: HEIGHT, pointerEvents: 'none' })}
      />
      <div
        data-layer="flash"
        style={abs({ inset: 0, background: 'white', opacity: 0, pointerEvents: 'none' })}
      />
    </div>
  );
}

/** A sealed verdict's render input as the reel draws it: sticker keys and the sentence's title. */
export function reelInput(r: RenderInput): ReelInput {
  return {
    winner: r.winner,
    loser: r.loser,
    sentence: r.sentence ? SENTENCES[r.sentence].title : '',
    tokens: r.topCrimes.map((c) => topCrimeInfo(c).sticker),
  };
}
