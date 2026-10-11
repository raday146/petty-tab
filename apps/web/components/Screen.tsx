import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Screen.module.css';

interface Props extends HTMLAttributes<HTMLElement> {
  /** A short screen shake, re-triggered by changing the key (design.md §6, after a stamp). */
  nudge?: boolean;
}

export function Screen({ nudge, className, ...rest }: Props): ReactNode {
  return <main className={cx(s.screen, nudge && s.nudge, className)} {...rest} />;
}
