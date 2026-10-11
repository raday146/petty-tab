import type { ReactNode } from 'react';
import { SPECIES, type Species } from '@petty-tab/art';
import { ropePosition, type UnitKey } from '@petty-tab/shared';
import { cx } from '@/lib/cx';
import { AnimalSticker } from '../AnimalSticker';
import { Pill } from '../Pill';
import s from './Scoreboard.module.css';

export interface Member {
  name: string;
  species: Species;
}
export type Owed = { unit: UnitKey; count: number }[];

interface Props {
  me: Member;
  them: Member;
  /** My points minus the partner's (spec §9). */
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  /** A unit on my side that just went up, to bump its pill. */
  bump?: UnitKey;
}

export function Scoreboard({ me, them, lead, meOwed, themOwed, bump }: Props): ReactNode {
  const leader = lead > 0 ? me : them;
  return (
    <section className={s.score} aria-label="Score">
      <div className={s.duel}>
        <Player member={me} face={lead === 0 ? 'plain' : lead > 0 ? 'smug' : 'strain'} dir={1} />
        <div className={s.mid}>
          <div className={s.rope} aria-hidden="true">
            <b className={s.marker} style={{ left: `${ropePosition(lead)}%` }} />
          </div>
          <p className={s.lead}>
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
      <div className={s.owed}>
        <OwedList member={me} owed={meOwed} bump={bump} />
        <OwedList member={them} owed={themOwed} />
      </div>
    </section>
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
      <AnimalSticker species={member.species} face={face} dir={dir} size={70} />
      <b className={cx(s.name, member.name.length > 8 && s.long)}>
        <bdi>{member.name}</bdi>
      </b>
      <span className={s.tag}>{SPECIES[member.species].tag}</span>
    </div>
  );
}

function OwedList({ member, owed, bump }: { member: Member; owed: Owed; bump?: UnitKey }): ReactNode {
  return (
    <div>
      <p className={s.owedLabel}>
        <bdi>{member.name}</bdi> is owed
      </p>
      <div className={s.pills}>
        {owed.map(({ unit, count }) => (
          <Pill key={unit} unit={unit} count={count} bump={unit === bump} />
        ))}
      </div>
    </div>
  );
}
