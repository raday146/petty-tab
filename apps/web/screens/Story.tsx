'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SPECIES } from '@petty-tab/art';
import { Reel, TAG, style, type ReelHandle, type ReelInput } from '@petty-tab/reel';
import { Art } from '@/components/Art';
import { CloseIcon, HeartIcon, PlayIcon, SendIcon, SoundIcon } from '@/components/icons';
import type { Member } from '@/components/tab/Scoreboard';
import { cx } from '@/lib/cx';
import s from './Story.module.css';

interface Props {
  reel: ReelInput;
  /** The frame is "your story": the viewer's avatar and handle, the partner's mention (design.md §6). */
  viewer: Member;
  partner: Member;
  onClose: () => void;
  /** Dev screens and screenshots only: open paused at this t. */
  still?: number;
}

const slug = (name: string, fallback: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '') || fallback;
const reduced = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Story preview (`14`): the reel playing live inside a story-viewer frame that is never exported. */
export function Story({ reel, viewer, partner, onClose, still }: Props): ReactNode {
  const player = useRef<ReelHandle>(null);
  const fill = useRef<HTMLElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);
  // Story only mounts on the client after a tap (or with `still`), so matchMedia is there.
  const [paused, setPaused] = useState(() => still === undefined && reduced());
  const [sound, setSound] = useState(true);
  const handle = `${slug(viewer.name, 'you')}.${SPECIES[viewer.species].tag.replace('The ', 'the').toLowerCase()}`;

  // reel.md §9: plays on open and loops; reduced motion opens paused on the final frame.
  useEffect(() => {
    const p = player.current!;
    if (still !== undefined || reduced()) p.seek(still ?? 5.7);
    else p.play();
    return () => p.pause();
  }, [still]);

  const onFrame = (t: number): void => {
    if (fill.current) fill.current.style.transform = `scaleX(${(t / 6).toFixed(4)})`;
    if (tag.current) Object.assign(tag.current.style, style(TAG, t));
  };

  const hold = (on: boolean): void => {
    if (paused) return;
    setHeld(on);
    if (on) player.current?.pause();
    else player.current?.play();
  };

  return (
    <main className={s.screen} aria-label="Your story">
      <div className={cx(s.frame, held && s.held)}>
        <Reel ref={player} input={reel} scale={390 / 1080} sound={sound && !still} onFrame={onFrame} />
        <div ref={tag} className={s.tag}>
          @<bdi>{slug(partner.name, 'partner')}</bdi>
        </div>
        <button
          type="button"
          className={s.hit}
          aria-label="Hold to pause the story"
          onPointerDown={() => hold(true)}
          onPointerUp={() => hold(false)}
          onPointerCancel={() => hold(false)}
        />
        <div className={s.top}>
          <div className={s.bars}>
            <i className={s.full} />
            <i>
              <b ref={fill} />
            </i>
            <i />
          </div>
          <div className={s.head}>
            <Art className={s.avatar} draw={(art) => art.avatar(viewer.species, 'plain')} />
            <b>{handle}</b>
            <span>now</span>
            <button
              type="button"
              aria-label="Sound"
              aria-pressed={sound}
              onClick={() => setSound((on) => !on)}
            >
              <SoundIcon on={sound} />
            </button>
            <button type="button" aria-label="Close the story" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>
        {paused && (
          <button
            type="button"
            className={s.play}
            onClick={() => {
              setPaused(false);
              player.current?.seek(0);
              player.current?.play();
            }}
          >
            <PlayIcon />
            Play story
          </button>
        )}
      </div>
      <div className={s.reply} aria-hidden>
        <span>Send message</span>
        <HeartIcon />
        <SendIcon />
      </div>
    </main>
  );
}
