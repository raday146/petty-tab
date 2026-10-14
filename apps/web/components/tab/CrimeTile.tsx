import { useContext, type ReactNode } from 'react';
import { crimeInfo } from '@petty-tab/shared';
import { Art } from '../Art';
import { Pill } from '../Pill';
import { Book } from './CrimeRow';
import s from './CrimeTile.module.css';

export function CrimeTile({ crime, onPick }: { crime: string; onPick: (crime: string) => void }): ReactNode {
  const c = crimeInfo(useContext(Book), crime);
  return (
    <button type="button" className={s.tile} onClick={() => onPick(crime)}>
      <Art className={s.sticker} draw={(art) => art.sticker(c.sticker)} />
      <b className={s.title}>{c.title}</b>
      <Pill unit={c.unit} onButter />
    </button>
  );
}
