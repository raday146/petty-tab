import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Stamp.module.css';

/** GUILTY (crimson) or DISPUTED (ink). Supplementary: the status is also given as text for screen readers. */
export function Stamp({ kind, className }: { kind: 'guilty' | 'appealed'; className?: string }): ReactNode {
  return (
    <span className={cx(s.stamp, kind === 'appealed' && s.navy, className)} aria-hidden="true">
      {kind === 'guilty' ? 'Guilty' : 'Disputed'}
    </span>
  );
}
