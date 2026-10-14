import type { ReactNode } from 'react';
import type { RulesSummary as Rules } from '@petty-tab/shared';
import s from './RulesSummary.module.css';

/** "Every 3 days at 20:00": the cycle in words (spec §10). */
export const cycleWords = (cycleDays: Rules['cycleDays']): string =>
  cycleDays ? `Every ${cycleDays} days at 20:00` : 'Every Sunday at 20:00';

const when = (iso: string): string =>
  new Date(iso)
    .toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .replace(',', '');

/**
 * spec §4: the proposed rules, on the invite (the creator's side) and the join page (the joiner's side).
 * Spans, not a list, so it fits inside a Notice's lead paragraph.
 */
export function RulesSummary({ rules, side }: { rules: Rules; side: 'inviter' | 'joiner' }): ReactNode {
  const titles = rules.crimes.map((c) => c.title);
  const whose = (owner: 'inviter' | 'you'): string =>
    (owner === 'you') === (side === 'joiner')
      ? 'your chore'
      : side === 'joiner'
        ? 'their chore'
        : "your partner's chore";
  return (
    <span className={s.rules} aria-label="The rules">
      <span>
        <b>Verdict:</b> {cycleWords(rules.cycleDays)}
        {rules.firstEnd && `, first one ${when(rules.firstEnd)}`}
      </span>
      <span>
        <b>{titles.length} crimes in play:</b> {titles.slice(0, 3).join(', ')}
        {titles.length > 3 && ` and ${titles.length - 3} more`}
      </span>
      {rules.chores.map((c) => (
        <span key={c.title}>
          <b>Daily chore:</b> {c.title}, {whose(c.owner)}
        </span>
      ))}
    </span>
  );
}
