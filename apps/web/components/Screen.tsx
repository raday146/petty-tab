import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Screen.module.css';

export function Screen({ className, ...rest }: ComponentProps<'main'>): ReactNode {
  return <main className={cx(s.screen, className)} {...rest} />;
}

/** The 300 ms screen shake after a stamp (design.md §6). Skipped under reduced motion. */
export function nudge(el: HTMLElement | null): void {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(4px, -3px)', offset: 0.2 },
      { transform: 'translate(-3px, 2px)', offset: 0.45 },
      { transform: 'translate(2px, -1px)', offset: 0.7 },
      { transform: 'none' },
    ],
    { duration: 300, easing: 'ease-out' },
  );
}
