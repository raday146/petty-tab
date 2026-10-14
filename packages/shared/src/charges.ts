import { z } from 'zod';
import type { Species } from '@petty-tab/art';
import { CRIME_KEYS, type ChargeStatus, type CrimeKey, type SentenceKey } from './catalog.ts';
import type { Owed } from './score.ts';

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

export const fileChargeBody = z.object({ crimeKey: z.enum(CRIME_KEYS as [CrimeKey, ...CrimeKey[]]) });
export const pleaBody = z.object({ plea: z.enum(['guilty', 'appeal']) });
export const appealBody = z.object({ decision: z.enum(['uphold', 'drop']) });

/** One charge as the viewer sees it. */
export interface TabCharge {
  id: string;
  crime: CrimeKey;
  status: ChargeStatus;
  filer: 'me' | 'them';
}

/** `GET /api/tab`: the current week from the viewer's side, charges newest first. */
export interface TabView {
  me: { name: string; species: Species };
  them: { name: string; species: Species };
  lead: number;
  meOwed: Owed;
  themOwed: Owed;
  charges: TabCharge[];
  /** A sealed verdict exists, so the "Verdict on Sunday" chip opens it (spec §10). */
  hasVerdict: boolean;
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
  | 'verdict.updated';

export interface TabEvent {
  type: EventType;
  chargeId?: string;
}
