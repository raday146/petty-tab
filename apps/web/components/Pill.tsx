import type { ReactNode } from 'react';
import { UNITS, unitLabel, type UnitKey } from '@petty-tab/shared';
import { cx } from '@/lib/cx';
import { Art } from './Art';
import s from './Pill.module.css';

interface Props {
  unit: UnitKey;
  /** A total ("4 coffees"); omitted for a single charge ("+1 coffee"). */
  count?: number;
  /** Paper fill for pills that sit on butter (plea card) or linen tiles. */
  onButter?: boolean;
  bump?: boolean;
}

export function Pill({ unit, count, onButter, bump }: Props): ReactNode {
  return (
    <span className={cx(s.pill, onButter && s.paper, bump && s.bump)}>
      <Art className={s.icon} draw={(art) => art.icon(UNITS[unit].icon)} />
      {unitLabel(unit, count)}
    </span>
  );
}
