'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { CRIMES, CRIME_KEYS, type CrimeKey, type UnitKey } from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { AnimalSticker } from '@/components/AnimalSticker';
import { Button } from '@/components/Button';
import { nudge, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Toast, useToast } from '@/components/Toast';
import { CourtCard } from '@/components/tab/CourtCard';
import { CrimeRow, type Charge } from '@/components/tab/CrimeRow';
import { CrimeTile } from '@/components/tab/CrimeTile';
import { Scoreboard, type Member, type Owed } from '@/components/tab/Scoreboard';
import { sfx } from '@/lib/sfx';
import { InviteLink } from './InviteSheet';
import s from './Tab.module.css';

export interface TabCharge extends Charge {
  filer: 'me' | 'them';
}

interface Props {
  me: Member;
  them: Member;
  /** Set while the partner has not joined: the invite card replaces the scoreboard, logging is off. */
  inviteLink?: string;
  /** Before the first verdict the chip is a label: "First verdict <day> 20:00" (spec §10). */
  firstVerdictDay?: string;
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  /** This week's charges, newest first. */
  charges: TabCharge[];
  /** Files a charge against the partner; returns its id for Undo. */
  onFile: (crime: CrimeKey) => string;
  onUndo: (id: string, crime: CrimeKey) => void;
  onPlea: (id: string, plea: 'guilty' | 'appeal') => void;
  onDecide: (id: string, decision: 'uphold' | 'drop') => void;
  onVerdict: () => void;
  onNewLink: () => void;
}

const SLAM_MS = 1900;

export function Tab(props: Props): ReactNode {
  const { me, them, inviteLink, firstVerdictDay, charges } = props;
  const [logOpen, setLogOpen] = useState(false);
  const [fresh, setFresh] = useState<string>();
  const [slam, setSlam] = useState<string>();
  const [bump, setBump] = useState<{ unit: UnitKey; n: number }>();
  const screen = useRef<HTMLElement>(null);
  const { toast, show, hide } = useToast();

  const stamp = useCallback((id: string) => {
    setSlam(id);
    setTimeout(() => {
      sfx.stamp();
      nudge(screen.current);
    }, 180);
    setTimeout(() => setSlam((cur) => (cur === id ? undefined : cur)), SLAM_MS);
  }, []);

  const file = (crime: CrimeKey): void => {
    setLogOpen(false);
    sfx.paper();
    setTimeout(sfx.pop, 180);
    const id = props.onFile(crime);
    setFresh(id);
    setBump((b) => ({ unit: CRIMES[crime].unit, n: (b?.n ?? 0) + 1 }));
    show({
      title: CRIMES[crime].title,
      message: CRIMES[crime].description,
      onUndo: () => props.onUndo(id, crime),
    });
  };

  const plead = (id: string, plea: 'guilty' | 'appeal'): void => {
    props.onPlea(id, plea);
    stamp(id);
    show(
      plea === 'guilty'
        ? { title: 'You plead guilty', message: 'No contest.' }
        : {
            title: 'You appeal',
            message: (
              <>
                <bdi>{them.name}</bdi> decides.
              </>
            ),
          },
    );
  };

  const decide = (id: string, decision: 'uphold' | 'drop'): void => {
    props.onDecide(id, decision);
    if (decision === 'uphold') stamp(id);
  };

  const accused = (c: TabCharge): Member => (c.filer === 'me' ? them : me);
  // spec §8 who-sees-what: plea cards for pending charges against me, appeal cards for appeals on mine.
  const isCard = (c: TabCharge): boolean =>
    (c.status === 'pending' && c.filer === 'them') || (c.status === 'appealed' && c.filer === 'me');

  return (
    <Screen ref={screen} className={s.screen} aria-label="The tab">
      <Toast toast={toast} onHide={hide} />
      <div className={s.head}>
        <div className={s.row}>
          <h1 className={s.title}>The Tab</h1>
          {firstVerdictDay ? (
            <span className={`${s.chip} ${s.label}`}>First verdict {firstVerdictDay} 20:00</span>
          ) : (
            <button type="button" className={s.chip} onClick={props.onVerdict}>
              <Art className={s.gavel} draw={(art) => art.icon('gavel')} />
              Verdict on Sunday
            </button>
          )}
        </div>
        {inviteLink ? (
          <section className={s.invite} aria-label="Invite your partner">
            <AnimalSticker species={me.species} size={70} />
            <h2 className={s.inviteTitle}>Waiting for your partner</h2>
            <p className={s.inviteLead}>Send this link to your partner.</p>
            <InviteLink link={inviteLink} />
            <button type="button" className={s.newLink} onClick={props.onNewLink}>
              New link
            </button>
          </section>
        ) : (
          <Scoreboard
            me={me}
            them={them}
            lead={props.lead}
            meOwed={props.meOwed}
            themOwed={props.themOwed}
            bump={bump}
          />
        )}
      </div>
      {!inviteLink && (
        <>
          <div className={s.feed}>
            {charges
              .filter(isCard)
              .map((c) =>
                c.filer === 'them' ? (
                  <CourtCard
                    key={c.id}
                    kind="plea"
                    charge={c}
                    accused={me}
                    filer={them}
                    onGuilty={() => plead(c.id, 'guilty')}
                    onAppeal={() => plead(c.id, 'appeal')}
                  />
                ) : (
                  <CourtCard
                    key={c.id}
                    kind="appeal"
                    charge={c}
                    accused={them}
                    onUphold={() => decide(c.id, 'uphold')}
                    onDrop={() => decide(c.id, 'drop')}
                  />
                ),
              )}
            {charges
              .filter((c) => !isCard(c))
              .map((c) => (
                <CrimeRow
                  key={c.id}
                  charge={c}
                  accused={accused(c)}
                  isNew={c.id === fresh}
                  slam={c.id === slam}
                />
              ))}
          </div>
          <div className={s.fab}>
            <Button
              onClick={() => {
                sfx.tap();
                setLogOpen(true);
              }}
            >
              <Art className={s.plus} draw={(art) => art.icon('plus')} />
              Log a petty crime
            </Button>
          </div>
          <Sheet
            open={logOpen}
            onClose={() => setLogOpen(false)}
            title={
              <>
                What did <bdi>{them.name}</bdi> do?
              </>
            }
          >
            <div className={s.picks}>
              {CRIME_KEYS.map((k) => (
                <CrimeTile key={k} crime={k} onPick={file} />
              ))}
            </div>
          </Sheet>
        </>
      )}
    </Screen>
  );
}
