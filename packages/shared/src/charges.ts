import { z } from 'zod';
import type { Species } from '@petty-tab/art';
import { CRIME_KEYS, type ChargeStatus, type CrimeInfo, type CrimeKey, type SentenceKey } from './catalog.ts';
import type { Owed } from './score.ts';
import type { CycleDays } from './week.ts';

/** spec §8: the filer can undo for 10 seconds. */
export const UNDO_MS = 10_000;
/** spec §8 / Open decision 2: 24 hours without a plea counts as guilty. */
export const PLEA_MS = 24 * 60 * 60 * 1000;

export type Actor = 'filer' | 'accused';
export type Plea = 'guilty' | 'appeal';
export type Decision = 'uphold' | 'drop';

const NEXT = { guilty: 'guilty', appeal: 'appealed', uphold: 'upheld', drop: 'dropped' } as const;

/**
 * spec §8: only the accused pleads on a pending charge, only the filer decides an appeal.
 * `ageMs` is the time since filing; past 24 hours silence has already pleaded guilty.
 */
export function transition(
  status: ChargeStatus,
  actor: Actor,
  action: Plea | Decision,
  ageMs: number,
): { status: ChargeStatus } | { error: 'not_allowed' | 'already_pleaded' } {
  if (action === 'guilty' || action === 'appeal') {
    if (actor !== 'accused') return { error: 'not_allowed' };
    if (status !== 'pending' || ageMs >= PLEA_MS) return { error: 'already_pleaded' };
  } else {
    if (actor !== 'filer' || status !== 'appealed') return { error: 'not_allowed' };
  }
  return { status: NEXT[action] };
}

/** spec §8: undo is the filer's, for 10 seconds, and only before any plea. */
export function canUndo(status: ChargeStatus, ageMs: number): 'already_pleaded' | 'undo_expired' | null {
  if (status !== 'pending') return 'already_pleaded';
  return ageMs < UNDO_MS ? null : 'undo_expired';
}

/** A catalog key, or `custom:<id>` of one of the pair's own crimes (checked against the pair by the API). */
export const fileChargeBody = z.object({
  crimeKey: z.union([
    z.enum(CRIME_KEYS as [CrimeKey, ...CrimeKey[]]),
    z.templateLiteral(['custom:', z.uuid()]),
  ]),
});
export const pleaBody = z.object({ plea: z.enum(['guilty', 'appeal']) });
export const appealBody = z.object({ decision: z.enum(['uphold', 'drop']) });
/** spec §10: `POST /deadline/proposal`. A new deadline for the current cycle, or null to settle now. */
export const proposalBody = z.object({ end: z.iso.datetime({ offset: true }).nullable() });

/** One charge as the viewer sees it. */
export interface TabCharge {
  id: string;
  /** A catalog key or `custom:<id>`; look it up in the tab's book (`bookFor(tab.custom)`). */
  crime: string;
  status: ChargeStatus;
  filer: 'me' | 'them';
}

/** One of the pair's own crimes, from the viewer's side. A chore names whose it is and today's tick. */
export interface CustomCrimeView extends CrimeInfo {
  id: string;
  removed: boolean;
  chore: { owner: 'me' | 'them'; doneToday: boolean } | null;
}

/** `GET /api/tab`: the current week from the viewer's side, charges newest first. */
export interface TabView {
  me: { name: string; species: Species };
  them: { name: string; species: Species };
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  charges: TabCharge[];
  /** Catalog crimes out of play for this pair (spec §6); the picker hides them. */
  crimesOff: CrimeKey[];
  /** spec §10: null weekly, or every 2, 3 or 5 days. */
  cycleDays: CycleDays;
  /** The pair's own crimes (spec §6); removed ones stay so old charges keep their title, out of the picker. */
  custom: CustomCrimeView[];
  /** A sealed verdict exists, so the deadline sheet offers it (spec §10). */
  hasVerdict: boolean;
  /** The current cycle's end (ISO) and the same in the pair's timezone, "Sun 20:00" (spec §10). */
  deadline: { end: string; label: string };
  /** The open deadline proposal (spec §10): `end` null is "settle now", `label` is the proposed time. */
  proposal: { mine: boolean; end: string | null; label: string | null } | null;
  /** Sentences not yet confirmed served, oldest first: "Alex still owes Maya: …" (spec §10). */
  unconfirmed: { winner: string; loser: string; sentence: SentenceKey }[];
}

/** Every `/api/events` message (spec §14). Clients refetch `/api/tab` on any of them. */
export type EventType =
  | 'charge.created'
  | 'charge.deleted'
  | 'plea.guilty'
  | 'plea.appeal'
  | 'appeal.upheld'
  | 'appeal.dropped'
  | 'member.joined'
  | 'member.updated'
  | 'member.left'
  | 'verdict.sealed'
  | 'verdict.settled'
  | 'verdict.updated'
  | 'deadline.proposed'
  | 'deadline.decided'
  | 'crimes.updated'
  | 'chore.updated';

export interface TabEvent {
  type: EventType;
  chargeId?: string;
}
