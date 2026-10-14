import type { ReactNode } from 'react';
import s from './Steps.module.css';

/** The setup wizard's progress (spec §4): three dots, the current one filled. No text label (CLAUDE.md). */
export function Steps({ at }: { at: 1 | 2 | 3 }): ReactNode {
  return (
    <span className={s.steps} role="img" aria-label={`Step ${at} of 3`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= at ? s.on : undefined} />
      ))}
    </span>
  );
}
