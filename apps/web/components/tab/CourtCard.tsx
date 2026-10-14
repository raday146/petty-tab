import type { ReactNode } from 'react';
import { CrimeRow, type Charge } from './CrimeRow';
import type { Member } from './Scoreboard';
import s from './CourtCard.module.css';

type Props = { charge: Charge; accused: Member } & (
  | {
      /** Shown to the accused: "<filer> says you did this." */
      kind: 'plea';
      filer: Member;
      onGuilty: () => void;
      onAppeal: () => void;
    }
  | {
      /** Shown to the filer: "<accused> cries foul." */
      kind: 'appeal';
      onUphold: () => void;
      onDrop: () => void;
    }
);

/** The plea card and the appeal card: the same butter card with a question and two answers (spec §8). */
export function CourtCard(props: Props): ReactNode {
  const { charge, accused } = props;
  return (
    <div className={s.card}>
      <CrimeRow charge={charge} accused={accused} inCard />
      <div className={s.ask}>
        {props.kind === 'plea' ? (
          <>
            <p>
              <bdi>{props.filer.name}</bdi> says you did this.
            </p>
            <button type="button" onClick={props.onGuilty}>
              Fine, I did it
            </button>
            <button type="button" className={s.outline} onClick={props.onAppeal}>
              Not me!
            </button>
          </>
        ) : (
          <>
            <p>
              <bdi>{accused.name}</bdi> cries foul.
            </p>
            <button type="button" onClick={props.onUphold}>
              Nice try
            </button>
            <button type="button" className={s.outline} onClick={props.onDrop}>
              Let it slide
            </button>
          </>
        )}
      </div>
    </div>
  );
}
