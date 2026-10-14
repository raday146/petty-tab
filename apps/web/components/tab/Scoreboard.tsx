import type { ReactNode } from 'react';
import { SPECIES, type Species } from '@petty-tab/art';
import { ropePosition, type Owed, type UnitKey } from '@petty-tab/shared';
import { cx } from '@/lib/cx';
import { AnimalSticker } from '../AnimalSticker';
import { Pill } from '../Pill';
import s from './Scoreboard.module.css';

export interface Member {
  name: string;
  species: Species;
}
export type { Owed } from '@petty-tab/shared';

interface Props {
  me: Member;
  them: Member;
  /** My points minus the partner's (spec §9). */
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  /** A unit on my side that just went up; a new `n` replays the bump. */
  bump?: { unit: UnitKey; n: number };
  /** Opens the tally sheet (who owes what), which keeps the card itself light. */
  onOpen: () => void;
}

export function Scoreboard({ me, them, lead, bump, onOpen }: Omit<Props, 'meOwed' | 'themOwed'>): ReactNode {
  const leader = lead > 0 ? me : them;
  return (
    <button type="button" className={s.score} aria-haspopup="dialog" onClick={onOpen}>
      <div className={s.duel}>
        <Player member={me} face={lead === 0 ? 'plain' : lead > 0 ? 'smug' : 'strain'} dir={1} />
        <div className={s.mid}>
          <div className={s.rope} aria-hidden="true">
            <b className={s.marker} style={{ left: `${ropePosition(lead)}%` }} />
          </div>
          <p key={bump?.n} className={cx(s.lead, bump && s.bump)}>
            {lead === 0 ? (
              'Dead even'
            ) : (
              <>
                <bdi>{leader.name}</bdi> leads by {Math.abs(lead)}
              </>
            )}
          </p>
        </div>
        <Player member={them} face={lead === 0 ? 'plain' : lead < 0 ? 'smug' : 'strain'} dir={-1} />
      </div>
      <span className={s.more}>Who owes what</span>
    </button>
  );
}

/** The tally sheet's body: what each member is owed this week, by unit (spec §9). */
export function Tally({ me, them, meOwed, themOwed, bump }: Omit<Props, 'lead' | 'onOpen'>): ReactNode {
  return (
    <div className={s.owed}>
      <OwedList member={me} owed={meOwed} bump={bump} />
      <OwedList member={them} owed={themOwed} />
    </div>
  );
}

function Player({
  member,
  face,
  dir,
}: {
  member: Member;
  face: 'plain' | 'smug' | 'strain';
  dir: 1 | -1;
}): ReactNode {
  return (
    <div className={s.player}>
      <AnimalSticker species={member.species} face={face} dir={dir} size={70} className={s.sticker} />
      <b className={cx(s.name, member.name.length > 8 && s.long)}>
        <bdi>{member.name}</bdi>
      </b>
      <span className={s.tag}>{SPECIES[member.species].tag}</span>
    </div>
  );
}

function OwedList({ member, owed, bump }: { member: Member; owed: Owed; bump?: Props['bump'] }): ReactNode {
  return (
    <div>
      <p className={s.owedLabel}>
        <bdi>{member.name}</bdi> is owed
      </p>
      <div className={s.pills}>
        {owed.length === 0 && <span className={s.none}>nothing</span>}
        {owed.map(({ unit, count }) => (
          <Pill
            key={unit === bump?.unit ? `${unit}-${bump.n}` : unit}
            unit={unit}
            count={count}
            bump={unit === bump?.unit}
          />
        ))}
      </div>
    </div>
  );
}
