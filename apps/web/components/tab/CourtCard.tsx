import type { ReactNode } from 'react';
import type { TabView } from '@petty-tab/shared';
import { cx } from '@/lib/cx';
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
      /** Shown to the filer: "<accused> is disputing this! What's the call?" */
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
      <div className={cx(s.ask, props.kind === 'appeal' && s.stacked)}>
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
              <bdi>{accused.name}</bdi> is disputing this! What&rsquo;s the call?
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

/**
 * spec §10: an open settle-now or move proposal. The partner answers it; the proposer can take it back.
 * Same butter card as the plea card, question above the answers.
 */
export function ProposalCard(props: {
  proposal: NonNullable<TabView['proposal']>;
  them: Member;
  /** The current deadline, "Sun 20:00". */
  deadline: string;
  onAnswer: (yes: boolean) => void;
  onWithdraw: () => void;
}): ReactNode {
  const { proposal, them } = props;
  const settle = proposal.end === null;
  return (
    <div className={s.card} role="group" aria-label={settle ? 'Settle now?' : 'Move the deadline?'}>
      <div className={cx(s.ask, s.stacked, s.proposal)}>
        {proposal.mine ? (
          <>
            <p>
              {settle ? 'You want to settle now.' : `You asked to move the verdict to ${proposal.label}.`}{' '}
              Waiting for <bdi>{them.name}</bdi>&hellip;
            </p>
            <button type="button" className={s.outline} onClick={props.onWithdraw}>
              Take it back
            </button>
          </>
        ) : (
          <>
            <p>
              {settle ? (
                <>
                  <bdi>{them.name}</bdi> wants to settle the tab right now! Ready to face the verdict?
                </>
              ) : (
                <>
                  <bdi>{them.name}</bdi> is moving the goalposts! Verdict {proposal.label} instead of{' '}
                  {props.deadline}.
                </>
              )}
            </p>
            <button type="button" onClick={() => props.onAnswer(true)}>
              {settle ? 'Settle now' : 'Deal'}
            </button>
            <button type="button" className={s.outline} onClick={() => props.onAnswer(false)}>
              {settle ? 'Not yet' : 'Nope'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
