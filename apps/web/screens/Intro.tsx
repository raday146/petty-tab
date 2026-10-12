import type { ReactNode } from 'react';
import { Art } from '@/components/Art';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import s from './Intro.module.css';

/** Shown only to someone with no pair (spec §4). The real flow is Start a tab → picker → invite sheet. */
export function Intro({ onStart }: { onStart: () => void }): ReactNode {
  return (
    <Screen aria-label="Intro">
      <div className={s.logo}>
        <h1 className={s.wordmark}>Petty Tab</h1>
        <svg className={s.squiggle} viewBox="0 0 230 16" aria-hidden="true">
          <path d="M4 9c18-8 26 8 44 0s26 8 44 0 26 8 44 0 26 8 44 0 28 6 46 1" />
        </svg>
        <p className={s.tagline}>Keep score of the little things. Settle up on Sunday.</p>
      </div>
      <Art className={s.hero} draw={(art) => art.scenes.hero()} />
      <div className={s.cta}>
        <Button onClick={onStart}>Start a tab</Button>
      </div>
    </Screen>
  );
}
