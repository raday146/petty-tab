'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  bookFor,
  CRIME_KEYS,
  crimeInfo,
  SENTENCES,
  type ChargeStatus,
  type CustomCrimeInput,
  type TabCharge,
  type TabView,
  type UnitKey,
} from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { AnimalSticker } from '@/components/AnimalSticker';
import { Button } from '@/components/Button';
import { NameChip } from '@/components/NameChip';
import { nudge, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Toast, useToast } from '@/components/Toast';
import { CourtCard, ProposalCard } from '@/components/tab/CourtCard';
import { Book, CrimeRow } from '@/components/tab/CrimeRow';
import { CrimeTile } from '@/components/tab/CrimeTile';
import { NewCrime } from '@/components/tab/NewCrime';
import { Scoreboard, Tally, type Member, type Owed } from '@/components/tab/Scoreboard';
import { ApiFailure } from '@/lib/api';
import { cx } from '@/lib/cx';
import { buzz, sfx } from '@/lib/sfx';
import { InviteLink } from './InviteSheet';
import s from './Tab.module.css';

export type { TabCharge };

interface Props {
  me: Member;
  them: Member;
  /** Set while the partner has not joined: the invite card replaces the scoreboard, logging is off. */
  inviteLink?: string;
  /** Before the first verdict the chip reads "First verdict <day> <time>" (spec §10). */
  firstVerdict?: boolean;
  /** The current deadline in the pair's timezone, "Sun 20:00" (spec §10); Sunday 20:00 while waiting. */
  deadline?: string;
  /** The open settle-now or move proposal (spec §10). */
  proposal?: TabView['proposal'];
  /** A sealed verdict exists: the deadline sheet offers it. */
  hasVerdict?: boolean;
  /** Proposes a new deadline (ISO), or null to settle now. Without it the chip opens no sheet (waiting). */
  onPropose?: (end: string | null) => Promise<void>;
  /** The partner's answer to a proposal. */
  onAnswer?: (yes: boolean) => void;
  /** The proposer takes it back. */
  onWithdraw?: () => void;
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  /** This week's charges, newest first. */
  charges: TabCharge[];
  /** Sentences still waiting for the winner's confirmation (spec §10). */
  unconfirmed?: TabView['unconfirmed'];
  /** Files a charge against the partner; resolves to its id for Undo. Without it there is no FAB (waiting). */
  onFile?: (crime: string) => string | Promise<string>;
  onUndo: (id: string, crime: string) => void;
  /** The pair's own crimes and chores (spec §6, §8). */
  custom?: TabView['custom'];
  onCreateCrime?: (body: CustomCrimeInput) => Promise<void>;
  onRemoveCrime?: (id: string) => void;
  /** Opens the Breakdown screen (a tap on the scoreboard); without it the tally sheet opens. */
  onBreakdown?: () => void;
  /** Ticks (or unticks) one of the viewer's chores for today. */
  onChore?: (id: string, done: boolean) => void;
  onPlea: (id: string, plea: 'guilty' | 'appeal') => void;
  onDecide: (id: string, decision: 'uphold' | 'drop') => void;
  onVerdict: () => void;
  onNewLink: () => void;
  /** Opens the picker to change the viewer's name or animal (the name chip, top end). */
  onEdit?: () => void;
}

const SLAM_MS = 1900;
const DAYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

/**
 * The quick choices for a new deadline, in the device's clock (the pair's timezone is the creator's device
 * zone). ponytail: a partner in another timezone sees these in theirs; the label on the card is the pair's.
 */
function quickDeadlines(now: Date): { label: string; end: Date }[] {
  const at = (days: number, hour: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  return [
    { label: 'Tonight 21:00', end: at(0, 21) },
    { label: 'In 3 days', end: at(3, 20) },
    { label: 'In 5 days', end: at(5, 20) },
  ].filter((q) => q.end.getTime() - now.getTime() >= 60 * 60 * 1000);
}

export function Tab(props: Props): ReactNode {
  const { me, them, inviteLink, charges, proposal } = props;
  const [day, time] = (props.deadline ?? 'Sun 20:00').split(' ') as [string, string];
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [picked, setPicked] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [editList, setEditList] = useState(false);
  const custom = useMemo(() => props.custom ?? [], [props.custom]);
  const book = useMemo(() => bookFor(custom), [custom]);
  const active = custom.filter((c) => !c.removed);
  const chores = active.filter((c) => c.chore);
  const [tallyOpen, setTallyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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

  const bumpPill = useCallback(
    (crime: string): void => {
      sfx.bump();
      setBump((b) => ({ unit: crimeInfo(book, crime).unit, n: (b?.n ?? 0) + 1 }));
    },
    [book],
  );

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
  }, [charges, stamp, bumpPill]);

  // design.md §5: the filing toast disappears early once the accused pleads.
  useEffect(() => {
    const c = charges.find((x) => x.id === undoable);
    if (c && c.status !== 'pending') hide();
  }, [charges, undoable, hide]);

  const file = async (crime: string): Promise<void> => {
    setLogOpen(false);
    buzz(10);
    sfx.paper();
    setTimeout(sfx.pop, 180);
    let id: string;
    try {
      id = await props.onFile!(crime);
    } catch (e) {
      // M7's guard: more than 60 writes in a minute.
      if (e instanceof ApiFailure && e.code === 'rate_limited') {
        setUndoable(undefined);
        show({
          title: 'Easy, tiger',
          message: "That's a lot of crimes for one minute. Try again in a moment.",
        });
      }
      return;
    }
    setFresh(id);
    bumpPill(crime);
    setUndoable(id);
    show({
      title: crimeInfo(book, crime).title,
      message: crimeInfo(book, crime).description,
      onUndo: () => props.onUndo(id, crime),
    });
  };

  const plead = (id: string, plea: 'guilty' | 'appeal'): void => {
    setUndoable(undefined);
    props.onPlea(id, plea);
    stamp(id);
    show(
      plea === 'guilty'
        ? { title: 'You owned it', message: 'Respect.' }
        : {
            title: 'You cried foul',
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

  const propose = (end: string | null): void => {
    setDeadlineOpen(false);
    props.onPropose?.(end).then(
      () =>
        show({
          title: end ? 'Proposal sent' : 'Settle now?',
          message: (
            <>
              Waiting for <bdi>{them.name}</bdi>.
            </>
          ),
        }),
      () =>
        show({ title: 'That time won’t work', message: 'Pick one at least an hour away, within two weeks.' }),
    );
  };

  const accused = (c: TabCharge): Member => (c.filer === 'me' ? them : me);
  // spec §8 who-sees-what: plea cards for pending charges against me, appeal cards for appeals on mine.
  const isCard = (c: TabCharge): boolean =>
    (c.status === 'pending' && c.filer === 'them') || (c.status === 'appealed' && c.filer === 'me');

  return (
    <Book.Provider value={book}>
      <Screen ref={screen} className={s.screen} aria-label="The tab">
        <Toast toast={toast} onHide={hide} />
        <div className={s.head}>
          <button
            type="button"
            className={s.help}
            aria-label="How it works"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
          {props.onEdit && (
            <NameChip className={s.me} name={me.name} species={me.species} onClick={props.onEdit} />
          )}
          <div className={s.row}>
            <h1 className={s.title}>The Tab</h1>
            {props.firstVerdict && !props.onPropose ? (
              <span className={`${s.chip} ${s.label}`}>
                First verdict {DAYS[day]} {time}
              </span>
            ) : (
              <button
                type="button"
                className={cx(s.chip, props.firstVerdict && s.label)}
                aria-haspopup={props.onPropose ? 'dialog' : undefined}
                onClick={props.onPropose ? () => setDeadlineOpen(true) : props.onVerdict}
              >
                {props.firstVerdict ? (
                  `First verdict ${DAYS[day]} ${time}`
                ) : (
                  <>
                    <Art className={s.gavel} draw={(art) => art.icon('gavel')} />
                    Verdict on {DAYS[day]}
                  </>
                )}
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
              bump={bump}
              onOpen={props.onBreakdown ?? (() => setTallyOpen(true))}
            />
          )}
          {!inviteLink && chores.length > 0 && (
            <ul className={s.chores} aria-label="Today's chores">
              {chores.map((c) =>
                c.chore!.owner === 'me' ? (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={c.chore!.doneToday}
                      onClick={() => {
                        if (!c.chore!.doneToday) sfx.pop();
                        props.onChore?.(c.id, !c.chore!.doneToday);
                      }}
                    >
                      <span className={s.tick} aria-hidden="true">
                        {c.chore!.doneToday ? '✓' : ''}
                      </span>
                      {c.title}
                      <small>{c.chore!.doneToday ? 'Done today' : 'Tap when done'}</small>
                    </button>
                  </li>
                ) : (
                  <li key={c.id} className={s.theirs}>
                    <span className={s.tick} aria-hidden="true">
                      {c.chore!.doneToday ? '✓' : ''}
                    </span>
                    <span>
                      <bdi>{them.name}</bdi>: {c.title}
                    </span>
                    <small>{c.chore!.doneToday ? 'Done today' : 'Not yet'}</small>
                  </li>
                ),
              )}
            </ul>
          )}
          {props.unconfirmed?.map((u, i) => (
            <p key={i} className={s.owes}>
              <bdi>{u.loser}</bdi> still owes <bdi>{u.winner}</bdi>: {SENTENCES[u.sentence].title}
            </p>
          ))}
        </div>
        {!inviteLink && (
          <>
            <div className={s.feed}>
              {proposal && (
                <ProposalCard
                  proposal={proposal}
                  them={them}
                  deadline={props.deadline ?? ''}
                  onAnswer={(yes) => props.onAnswer?.(yes)}
                  onWithdraw={() => props.onWithdraw?.()}
                />
              )}
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
              open={deadlineOpen}
              onClose={() => setDeadlineOpen(false)}
              title={`Verdict ${DAYS[day]} ${time}`}
              lead={
                proposal ? (
                  proposal.mine ? (
                    <>
                      Waiting for <bdi>{them.name}</bdi> to answer.
                    </>
                  ) : (
                    <>
                      <bdi>{them.name}</bdi> has a proposal for you on the tab.
                    </>
                  )
                ) : (
                  <>
                    Change it only if <bdi>{them.name}</bdi> agrees.
                  </>
                )
              }
            >
              {!proposal && (
                <div className={s.when}>
                  <Button onClick={() => propose(null)}>Settle now</Button>
                  <p>Or move it:</p>
                  <div className={s.quick}>
                    {quickDeadlines(new Date()).map((q) => (
                      <button key={q.label} type="button" onClick={() => propose(q.end.toISOString())}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                  <form
                    className={s.pick}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (picked) propose(new Date(picked).toISOString());
                    }}
                  >
                    <input
                      type="datetime-local"
                      aria-label="Pick a time"
                      required
                      value={picked}
                      onChange={(e) => setPicked(e.target.value)}
                    />
                    <button type="submit">Propose</button>
                  </form>
                </div>
              )}
              {proposal?.mine && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeadlineOpen(false);
                    props.onWithdraw?.();
                  }}
                >
                  Take it back
                </Button>
              )}
              {props.hasVerdict && (
                <button
                  type="button"
                  className={s.last}
                  onClick={() => {
                    setDeadlineOpen(false);
                    props.onVerdict();
                  }}
                >
                  See the last verdict
                </button>
              )}
            </Sheet>
            <Sheet open={tallyOpen} onClose={() => setTallyOpen(false)} title="Who owes what">
              <Tally me={me} them={them} meOwed={props.meOwed} themOwed={props.themOwed} bump={bump} />
            </Sheet>
            <Sheet
              open={logOpen}
              onClose={() => setLogOpen(false)}
              title={
                <>
                  What did <bdi>{them.name}</bdi> do?
                </>
              }
            >
              {editList ? (
                <ul className={s.ownList}>
                  {active.map((c) => (
                    <li key={c.id}>
                      <span>
                        {c.title}
                        {c.chore && <small> · daily chore</small>}
                      </span>
                      <button type="button" onClick={() => props.onRemoveCrime?.(c.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={s.picks}>
                  {active.map((c) => (
                    <CrimeTile key={c.id} crime={`custom:${c.id}`} onPick={(crime) => void file(crime)} />
                  ))}
                  {CRIME_KEYS.map((k) => (
                    <CrimeTile key={k} crime={k} onPick={(crime) => void file(crime)} />
                  ))}
                </div>
              )}
              {props.onCreateCrime && (
                <div className={s.own}>
                  <button
                    type="button"
                    onClick={() => {
                      setLogOpen(false);
                      setNewOpen(true);
                    }}
                  >
                    + New crime or chore
                  </button>
                  {active.length > 0 && (
                    <button type="button" onClick={() => setEditList(!editList)}>
                      {editList ? 'Done' : 'Edit your list'}
                    </button>
                  )}
                </div>
              )}
            </Sheet>
            <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="A crime of your own">
              {newOpen && (
                <NewCrime
                  them={them.name}
                  onCreate={(body) =>
                    props.onCreateCrime!(body).then(
                      () => {
                        setNewOpen(false);
                        show({ title: 'Added', message: `${body.title.trim()} is on the list.` });
                      },
                      () => show({ title: 'Not added', message: 'Keep it to 30. Remove one first.' }),
                    )
                  }
                />
              )}
            </Sheet>
          </>
        )}
        <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="How it works">
          <ol className={s.steps}>
            <li>
              <b>Log a slip-up.</b> Three drops of milk left in the carton? Log it. Every crime adds a coffee,
              a dish load or a foot rub to what <bdi>{them.name}</bdi> owes you.
            </li>
            <li>
              <b>Own it or dispute it.</b> The accused taps &ldquo;Fine, I did it&rdquo; or &ldquo;Not
              me!&rdquo;. Disputed? The one who logged it makes the call. Silence for a day counts as owning
              it.
            </li>
            <li>
              <b>Verdict day.</b> Sunday at 20:00, or sooner if you both tap Settle now, the week seals.
              Whoever was charged more is found guilty and owes a sentence. Share the card, then start fresh
              at 0&ndash;0.
            </li>
          </ol>
          <Button onClick={() => setHelpOpen(false)}>Got it</Button>
        </Sheet>
      </Screen>
    </Book.Provider>
  );
}
