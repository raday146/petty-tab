import type { ReactNode } from 'react';
import type { Face } from '@petty-tab/art';
import { CRIMES, type ChargeStatus, type CrimeKey } from '@petty-tab/shared';
import { cx } from '@/lib/cx';
import { AnimalSticker } from '../AnimalSticker';
import { Pill } from '../Pill';
import { Stamp } from '../Stamp';
import type { Member } from './Scoreboard';
import s from './CrimeRow.module.css';

/** design.md §6: the sticker shows the accused, with a face for the status. */
const FACE: Record<ChargeStatus, Face> = {
  pending: 'plain',
  guilty: 'sad',
  upheld: 'sad',
  appealed: 'smug',
  dropped: 'plain',
};

export interface Charge {
  id: string;
  crime: CrimeKey;
  status: ChargeStatus;
}

interface Props {
  charge: Charge;
  accused: Member;
  /** Just filed: drops in. */
  isNew?: boolean;
  /** Just pleaded or upheld: the stamp slams for 1.9 s. */
  slam?: boolean;
  /** Inside a plea or appeal card: no side padding, paper pill. */
  inCard?: boolean;
}

export function CrimeRow({ charge, accused, isNew, slam, inCard }: Props): ReactNode {
  const crime = CRIMES[charge.crime];
  const status = charge.status;
  return (
    <div className={cx(s.row, inCard && s.flush, isNew && s.new, slam && s.slam)}>
      <AnimalSticker species={accused.species} face={FACE[status]} size={46} />
      <b className={cx(s.title, status === 'dropped' && s.dropped)}>
        {crime.title}
        <span className="sr-only">
          , <bdi>{accused.name}</bdi>, {status}
        </span>
      </b>
      <span className={s.end}>
        {status === 'appealed' ? (
          <span className={s.appealedPill}>Appealed</span>
        ) : status === 'dropped' ? null : (
          <Pill unit={crime.unit} onButter={inCard} />
        )}
      </span>
      {slam && (status === 'appealed' || status === 'guilty' || status === 'upheld') && (
        <Stamp kind={status === 'appealed' ? 'appealed' : 'guilty'} className={s.stamp} />
      )}
    </div>
  );
}
