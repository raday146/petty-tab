import { useContext, type ReactNode } from 'react';
import { crimeInfo } from '@petty-tab/shared';
import { Art } from '../Art';
import { Pill } from '../Pill';
import { Book } from './CrimeRow';
import { cx } from '@/lib/cx';
import s from './CrimeTile.module.css';

export function CrimeTile({
  crime,
  onPick,
  off,
}: {
  crime: string;
  onPick: (crime: string) => void;
  /** Setup (spec §4): a toggle, dimmed while the crime is out of play. */
  off?: boolean;
}): ReactNode {
  const c = crimeInfo(useContext(Book), crime);
  return (
    <button
      type="button"
      className={cx(s.tile, off && s.off)}
      aria-pressed={off === undefined ? undefined : !off}
      onClick={() => onPick(crime)}
    >
      <Art className={s.sticker} draw={(art) => art.sticker(c.sticker)} />
      <b className={s.title}>{c.title}</b>
      <Pill unit={c.unit} onButter />
    </button>
  );
}
