import type { ReactNode } from 'react';
import { SPECIES, type Species } from '@petty-tab/art';
import { cx } from '@/lib/cx';
import { Art } from './Art';
import { CheckIcon } from './icons';
import s from './AnimalCard.module.css';

interface Props {
  species: Species;
  selected: boolean;
  /** The partner's name when this animal is theirs (spec §4.3: it cannot be picked). */
  takenBy?: string;
  onPick: (species: Species) => void;
}

export function AnimalCard({ species, selected, takenBy, onPick }: Props): ReactNode {
  const info = SPECIES[species];
  return (
    <button
      type="button"
      className={cx(s.card, selected && s.selected)}
      aria-pressed={selected}
      disabled={takenBy !== undefined}
      onClick={() => onPick(species)}
    >
      <span className={s.portrait} style={{ background: info.bg }}>
        <Art draw={(art) => art.portrait(species)} />
      </span>
      <span className={s.text}>
        <b className={s.title}>{info.name}</b>
        <span className={s.bio}>{info.trait}</span>
      </span>
      {takenBy !== undefined && (
        <i className={s.taken}>
          <bdi>{takenBy}</bdi>
          <span className="sr-only">&apos;s animal</span>
        </i>
      )}
      {selected && <CheckIcon className={s.check} />}
    </button>
  );
}
