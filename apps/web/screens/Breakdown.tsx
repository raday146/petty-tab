'use client';

import type { ReactNode } from 'react';
import type { BreakdownView, Quip } from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { BackIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Tally, type Member, type Owed } from '@/components/tab/Scoreboard';
import s from './Breakdown.module.css';

const Line = ({ quip }: { quip: Quip }): ReactNode => (
  <p className={s.quip}>
    {quip.name && (
      <>
        <bdi>{quip.name}</bdi>{' '}
      </>
    )}
    {quip.text}
  </p>
);

const date = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The Breakdown (design.md §6): who did what this week, past verdicts, all-time stats, with a line for each. */
export function Breakdown({
  view,
  me,
  them,
  meOwed,
  themOwed,
  onBack,
}: {
  view?: BreakdownView;
  me: Member;
  them: Member;
  meOwed: Owed;
  themOwed: Owed;
  onBack: () => void;
}): ReactNode {
  const name = (who: 'me' | 'them'): ReactNode => <bdi>{who === 'me' ? me.name : them.name}</bdi>;
  return (
    <Screen className={s.screen} aria-label="The breakdown">
      <button type="button" className={s.back} aria-label="Back to the tab" onClick={onBack}>
        <BackIcon />
      </button>
      <h1 className={s.title}>The breakdown</h1>

      <section aria-labelledby="owed">
        <h2 id="owed">Who owes what</h2>
        <Tally me={me} them={them} meOwed={meOwed} themOwed={themOwed} />
      </section>

      {view && (
        <>
          <section aria-labelledby="week">
            <h2 id="week">This week</h2>
            {(['them', 'me'] as const).map((who) => {
              const side = view.week[who];
              return (
                <div key={who} className={s.side}>
                  <h3>What {name(who)} did</h3>
                  {side.crimes.length > 0 && (
                    <ul className={s.crimes}>
                      {side.crimes.map((c) => (
                        <li key={c.title}>
                          <Art className={s.sticker} draw={(art) => art.sticker(c.sticker)} />
                          <span>{c.title}</span>
                          {c.count > 1 && <i>×{c.count}</i>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {side.slid > 0 && (
                    <p className={s.mute}>
                      {side.slid} let slide. {who === 'me' ? 'Lucky you.' : 'How generous.'}
                    </p>
                  )}
                  <Line quip={side.quip} />
                </div>
              );
            })}
          </section>

          {view.chores.length > 0 && (
            <section aria-labelledby="chores">
              <h2 id="chores">Chores this week</h2>
              <ul className={s.rows}>
                {view.chores.map((c) => (
                  <li key={c.title}>
                    <span>
                      {name(c.owner)}: {c.title}
                    </span>
                    <span>
                      {c.done} done{c.neglected > 0 && `, ${c.neglected} ghosted`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={s.quip}>
                {view.chores.every((c) => !c.neglected)
                  ? 'Spotless. Who are you people?'
                  : 'Some chores got ghosted. The tab noticed.'}
              </p>
            </section>
          )}

          <section aria-labelledby="alltime">
            <h2 id="alltime">All-time</h2>
            <ul className={s.rows}>
              <li>
                <span>Wins</span>
                <span>
                  {name('me')} {view.allTime.wins.me} – {view.allTime.wins.them} {name('them')}
                </span>
              </li>
              {view.allTime.ties > 0 && (
                <li>
                  <span>Dead even</span>
                  <span>{view.allTime.ties}</span>
                </li>
              )}
              {(['me', 'them'] as const).map(
                (who) =>
                  view.allTime.worst[who] && (
                    <li key={who}>
                      <span>{name(who)}&rsquo;s signature move</span>
                      <span>{view.allTime.worst[who]}</span>
                    </li>
                  ),
              )}
            </ul>
            <Line quip={view.allTime.quip} />
          </section>

          {view.history.length > 0 && (
            <section aria-labelledby="history">
              <h2 id="history">Past verdicts</h2>
              <ul className={s.rows}>
                {view.history.map((h) => (
                  <li key={h.id}>
                    <span>
                      {date(h.end)} · {h.winner ? <bdi>{h.winner}</bdi> : 'Dead even'}
                      {h.winner && ' won'}
                    </span>
                    <span>
                      {h.points[0]}–{h.points[1]}
                      {h.top && <small> · {h.top}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
