'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CRIMES,
  CRIME_KEYS,
  type ChargeStatus,
  type CrimeKey,
  type TabCharge,
  type UnitKey,
} from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { AnimalSticker } from '@/components/AnimalSticker';
import { Button } from '@/components/Button';
import { NameChip } from '@/components/NameChip';
import { nudge, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Toast, useToast } from '@/components/Toast';
import { CourtCard } from '@/components/tab/CourtCard';
import { CrimeRow } from '@/components/tab/CrimeRow';
import { CrimeTile } from '@/components/tab/CrimeTile';
import { Scoreboard, type Member, type Owed } from '@/components/tab/Scoreboard';
import { ApiFailure } from '@/lib/api';
import { sfx } from '@/lib/sfx';
import { InviteLink } from './InviteSheet';
import s from './Tab.module.css';

export type { TabCharge };

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
  /** Files a charge against the partner; resolves to its id for Undo. Without it there is no FAB (waiting). */
  onFile?: (crime: CrimeKey) => string | Promise<string>;
  onUndo: (id: string, crime: CrimeKey) => void;
  onPlea: (id: string, plea: 'guilty' | 'appeal') => void;
  onDecide: (id: string, decision: 'uphold' | 'drop') => void;
  onVerdict: () => void;
  onNewLink: () => void;
  /** Opens the picker to change the viewer's name or animal (the name chip, top end). */
  onEdit?: () => void;
}

const SLAM_MS = 1900;

export function Tab(props: Props): ReactNode {
  const { me, them, inviteLink, firstVerdictDay, charges } = props;
  const [logOpen, setLogOpen] = useState(false);
  const [fresh, setFresh] = useState<string>();
  const [slam, setSlam] = useState<string>();
  const [bump, setBump] = useState<{ unit: UnitKey; n: number }>();
  const [undoable, setUndoable] = useState<string>();
  const screen = useRef<HTMLElement>(null);
  const seen = useRef<Map<string, ChargeStatus>>(null);
  const { toast, show, hide } = useToast();

  const stamp = useCallback((id: string) => {
    setSlam(id);
    setTimeout(() => {
      sfx.stamp();
      nudge(screen.current);
    }, 180);
    setTimeout(() => setSlam((cur) => (cur === id ? undefined : cur)), SLAM_MS);
  }, []);

  const bumpPill = (crime: CrimeKey): void =>
    setBump((b) => ({ unit: CRIMES[crime].unit, n: (b?.n ?? 0) + 1 }));

  // The partner's answers arrive as new statuses: the filer sees a guilty plea stamp and the pill bump,
  // the accused sees an upheld appeal stamp. The viewer's own pleas and decisions stamp where they happen.
  useEffect(() => {
    const before = seen.current;
    seen.current = new Map(charges.map((c) => [c.id, c.status]));
    if (!before) return;
    for (const c of charges) {
      const was = before.get(c.id);
      if (c.filer === 'me' && was === 'pending' && c.status === 'guilty') {
        stamp(c.id);
        bumpPill(c.crime);
      }
      if (c.filer === 'them' && was === 'appealed' && c.status === 'upheld') stamp(c.id);
    }
  }, [charges, stamp]);

  // design.md §5: the filing toast disappears early once the accused pleads.
  useEffect(() => {
    const c = charges.find((x) => x.id === undoable);
    if (c && c.status !== 'pending') hide();
  }, [charges, undoable, hide]);

  const file = async (crime: CrimeKey): Promise<void> => {
    setLogOpen(false);
    sfx.paper();
    setTimeout(sfx.pop, 180);
    let id: string;
    try {
      id = await props.onFile!(crime);
    } catch (e) {
      // spec §8: the 11th charge in 24 hours.
      if (e instanceof ApiFailure && e.code === 'rate_limited') {
        setUndoable(undefined);
        show({
          title: 'The court needs a break',
          message: 'Ten charges in a day is plenty. Try again tomorrow.',
        });
      }
      return;
    }
    setFresh(id);
    bumpPill(crime);
    setUndoable(id);
    show({
      title: CRIMES[crime].title,
      message: CRIMES[crime].description,
      onUndo: () => props.onUndo(id, crime),
    });
  };

  const plead = (id: string, plea: 'guilty' | 'appeal'): void => {
    setUndoable(undefined);
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
    if (decision !== 'uphold') return;
    stamp(id);
    // The upheld charge counts again.
    const c = charges.find((x) => x.id === id);
    if (c) bumpPill(c.crime);
  };

  const accused = (c: TabCharge): Member => (c.filer === 'me' ? them : me);
  // spec §8 who-sees-what: plea cards for pending charges against me, appeal cards for appeals on mine.
  const isCard = (c: TabCharge): boolean =>
    (c.status === 'pending' && c.filer === 'them') || (c.status === 'appealed' && c.filer === 'me');

  return (
    <Screen ref={screen} className={s.screen} aria-label="The tab">
      <Toast toast={toast} onHide={hide} />
      <div className={s.head}>
        {props.onEdit && (
          <NameChip className={s.me} name={me.name} species={me.species} onClick={props.onEdit} />
        )}
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
          {props.onFile && (
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
          )}
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
                <CrimeTile key={k} crime={k} onPick={(crime) => void file(crime)} />
              ))}
            </div>
          </Sheet>
        </>
      )}
    </Screen>
  );
}
