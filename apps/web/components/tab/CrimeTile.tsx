import type { ReactNode } from 'react';
import { CRIMES, type CrimeKey } from '@petty-tab/shared';
import { Art } from '../Art';
import { Pill } from '../Pill';
import s from './CrimeTile.module.css';

export function CrimeTile({
  crime,
  onPick,
}: {
  crime: CrimeKey;
  onPick: (crime: CrimeKey) => void;
}): ReactNode {
  const c = CRIMES[crime];
  return (
    <button type="button" className={s.tile} onClick={() => onPick(crime)}>
      <Art className={s.sticker} draw={(art) => art.sticker(c.sticker)} />
      <b className={s.title}>{c.title}</b>
      <Pill unit={c.unit} onButter />
    </button>
  );
}
