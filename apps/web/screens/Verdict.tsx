'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SPECIES } from '@petty-tab/art';
import { CRIMES, SENTENCES, SENTENCE_KEYS, rng, type CrimeKey, type SentenceKey } from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { Button } from '@/components/Button';
import { nudge, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Toast, useToast } from '@/components/Toast';
import { BackIcon, DiceIcon, ReplayIcon, ShareIcon, WhatsAppIcon } from '@/components/icons';
import type { Member } from '@/components/tab/Scoreboard';
import { cx } from '@/lib/cx';
import { sfx } from '@/lib/sfx';
import s from './Verdict.module.css';

export interface VerdictData {
  /** Names are always winner first (spec §10). On a tie: the members in join order. */
  winner: Member;
  loser: Member;
  tie: boolean;
  topCrimes: { crime: CrimeKey; count: number }[];
  sentence: SentenceKey;
  /** The sentence can no longer change (first winner share, or Monday 20:00). */
  locked: boolean;
  served: boolean;
  confirmed: boolean;
}

interface Props {
  verdict: VerdictData;
  /** Who is looking: the controls differ (spec §10, "Verdict screen controls by role"). */
  viewer: 'winner' | 'loser';
  onBack: () => void;
  onSentence: (sentence: SentenceKey) => void;
  onShare: (target: 'story' | 'whatsapp' | 'card') => void;
  onServed: () => void;
  onConfirm: () => void;
}

const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Verdict({ verdict: v, viewer, ...on }: Props): ReactNode {
  const [run, setRun] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flip, setFlip] = useState(0);
  const { toast, show, hide } = useToast();
  const screen = useRef<HTMLElement>(null);
  const canChange = viewer === 'winner' && !v.locked && !v.tie;
  const nameChars = v.winner.name.length + v.loser.name.length;

  // Sounds and confetti follow the CSS reveal; both are skipped under reduced motion.
  useEffect(() => {
    if (reduced()) return;
    const timers = [
      setTimeout(sfx.gavel, 200),
      ...(v.tie
        ? []
        : [
            setTimeout(() => [0, 1, 2, 3].forEach((i) => sfx.thump(0.3 + i * 0.13)), 900),
            setTimeout(() => {
              sfx.stamp();
              nudge(screen.current);
            }, 2080),
            setTimeout(sfx.chime, 2600),
            setTimeout(sfx.paper, 3200),
            setTimeout(sfx.pop, 3700),
          ]),
    ];
    return () => timers.forEach(clearTimeout);
  }, [run, v.tie]);

  const pick = (key: SentenceKey): void => {
    setSheetOpen(false);
    on.onSentence(key);
    setFlip((f) => f + 1);
    sfx.stamp();
    show({ title: SENTENCES[key].title, message: SENTENCES[key].detail });
  };

  return (
    <Screen ref={screen} className={s.screen} aria-label="The Sunday verdict">
      <Toast toast={toast} onHide={hide} />
      <button type="button" className={cx(s.rnd, s.back)} aria-label="Back to the tab" onClick={on.onBack}>
        <BackIcon />
      </button>
      {canChange && (
        <button
          type="button"
          className={cx(s.rnd, s.dice)}
          aria-label="Change the sentence"
          onClick={() => setSheetOpen(true)}
        >
          <DiceIcon />
        </button>
      )}
      <button
        type="button"
        className={cx(s.rnd, s.again)}
        aria-label="Replay the verdict"
        onClick={() => {
          sfx.tap();
          setRun((r) => r + 1);
        }}
      >
        <ReplayIcon />
      </button>

      <article className={s.card} key={run} aria-label="Verdict card">
        <h1 className={cx(s.vs, nameChars > 18 ? s.vsS : nameChars > 12 && s.vsM)}>
          {v.tie ? (
            'Dead even'
          ) : (
            <>
              <bdi>{v.winner.name}</bdi> vs. <bdi>{v.loser.name}</bdi>
            </>
          )}
        </h1>
        {v.tie && (
          <p className={s.members}>
            <bdi>{v.winner.name}</bdi> and <bdi>{v.loser.name}</bdi>
          </p>
        )}

        <div
          className={s.pic}
          role="img"
          aria-label={
            v.tie
              ? `${v.winner.name} and ${v.loser.name}, dead even`
              : `${v.winner.name} the ${SPECIES[v.winner.species].tag.slice(4)} wins; ${v.loser.name} the ${SPECIES[v.loser.species].tag.slice(4)} is buried in laundry`
          }
        >
          {v.tie ? (
            <div className={s.tiePic}>
              <Art draw={(art) => art.portrait(v.winner.species)} />
              <Art draw={(art) => art.portrait(v.loser.species)} />
            </div>
          ) : (
            <>
              <Art
                className={s.scene}
                draw={(art) =>
                  art.scenes.verdict({
                    winner: v.winner.species,
                    loser: v.loser.species,
                    tokens: v.topCrimes.map((t) => CRIMES[t.crime].sticker),
                  })
                }
              />
              <div className={s.vstamp} aria-hidden="true">
                GUILTY
              </div>
            </>
          )}
        </div>

        {!v.tie && (
          <div className={s.plates}>
            <div>
              <b>
                <bdi>{v.winner.name}</bdi>
              </b>
              <span>{SPECIES[v.winner.species].name}</span>
            </div>
            <div>
              <b>
                <bdi>{v.loser.name}</bdi>
              </b>
              <span>{SPECIES[v.loser.species].name}</span>
            </div>
          </div>
        )}

        {v.tie ? (
          <p className={s.tieLine}>No one owes anyone. Suspicious.</p>
        ) : (
          <div className={s.sent}>
            <p className={s.owes}>
              <bdi>{v.loser.name}</bdi> owes <bdi>{v.winner.name}</bdi>
            </p>
            {canChange ? (
              <button
                type="button"
                key={flip}
                className={cx(s.sentence, flip > 0 && s.flip)}
                aria-label={`${SENTENCES[v.sentence].title}. Change the sentence`}
                onClick={() => {
                  sfx.tap();
                  setSheetOpen(true);
                }}
              >
                {SENTENCES[v.sentence].title}
              </button>
            ) : (
              <p className={s.sentence}>{SENTENCES[v.sentence].title}</p>
            )}
          </div>
        )}

        {!v.tie && (
          <div className={s.chips}>
            {v.topCrimes.map((t, i) => (
              <span key={t.crime} className={s.chip} style={{ '--i': i } as CSSProperties}>
                <Art draw={(art) => art.sticker(CRIMES[t.crime].sticker)} />
                {CRIMES[t.crime].title}
                {t.count > 1 && <i>×{t.count}</i>}
              </span>
            ))}
          </div>
        )}
        <div className={s.foot}>petty tab</div>
        {!v.tie && <Confetti />}
      </article>

      <div className={s.sharebar}>
        {v.tie ? (
          <Button onClick={() => on.onShare('card')}>
            <ShareIcon />
            Share card
          </Button>
        ) : (
          <>
            <Button onClick={() => on.onShare('story')}>
              <ShareIcon />
              Share story
            </Button>
            <Button variant="outline" onClick={() => on.onShare('whatsapp')}>
              <WhatsAppIcon />
              Send to WhatsApp
            </Button>
          </>
        )}
      </div>
      {!v.tie && (
        <ServedControl verdict={v} viewer={viewer} onServed={on.onServed} onConfirm={on.onConfirm} />
      )}

      {canChange && (
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Pick the sentence">
          <div className={s.sopts}>
            {SENTENCE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={s.sopt}
                aria-pressed={key === v.sentence}
                onClick={() => pick(key)}
              >
                <Art draw={(art) => art.icon(SENTENCES[key].icon)} />
                {SENTENCES[key].title}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </Screen>
  );
}

/** spec §10: the loser marks it served, the winner confirms; then a quiet line. */
function ServedControl({
  verdict: v,
  viewer,
  onServed,
  onConfirm,
}: {
  verdict: VerdictData;
  viewer: 'winner' | 'loser';
  onServed: () => void;
  onConfirm: () => void;
}): ReactNode {
  if (v.confirmed) return <p className={s.done}>Served and confirmed.</p>;
  if (viewer === 'loser')
    return (
      <div className={s.served}>
        <Button variant="outline" onClick={onServed} disabled={v.served}>
          {v.served ? (
            <span>
              Waiting for <bdi>{v.winner.name}</bdi>
            </span>
          ) : (
            'I served it'
          )}
        </Button>
      </div>
    );
  if (!v.served) return null;
  return (
    <div className={s.served}>
      <Button variant="outline" onClick={onConfirm}>
        Confirm it&apos;s served
      </Button>
    </div>
  );
}

/** A short fall of confetti when the crown lands (2.6 s), seeded so every replay looks the same. */
function Confetti(): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const css = getComputedStyle(canvas);
    const colors = ['--mustard', '--crimson', '--ink', '--mustard'].map((c) => css.getPropertyValue(c));
    const w = (canvas.width = canvas.clientWidth);
    const h = (canvas.height = canvas.clientHeight);
    const r = rng(21);
    const parts = Array.from({ length: 40 }, (_, i) => ({
      x: 20 + r() * (w - 40),
      y: -20 - r() * 200,
      vx: (r() - 0.5) * 1.2,
      vy: 1.6 + r() * 2.2,
      h: i % 3 ? 11 : 5,
      rot: r() * 6,
      vr: (r() - 0.5) * 0.2,
      color: colors[i % 4]!,
      life: 230,
    }));
    let raf = 0;
    const tick = (): void => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of parts) {
        if (p.life <= 0 || p.y > h + 27) continue;
        alive = true;
        p.x += p.vx + Math.sin(p.y / 26) * 0.6;
        p.y += p.vy;
        p.rot += p.vr;
        p.life--;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.fillStyle = p.color;
        ctx.fillRect(-2.5, -p.h / 2, 5, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    const start = setTimeout(() => (raf = requestAnimationFrame(tick)), 2600);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} className={s.confetti} aria-hidden="true" />;
}
