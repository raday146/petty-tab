import { CRIMES, crimeInfo, type ChargeStatus, type CrimeBook, type UnitKey } from './catalog.ts';

/** What one member is owed, grouped by unit in the order the units were first filed. */
export type Owed = { unit: UnitKey; count: number }[];

/** spec §8: `guilty`, `pending` and `upheld` count toward the score. */
export function counts(status: ChargeStatus): boolean {
  return status === 'guilty' || status === 'pending' || status === 'upheld';
}

/**
 * spec §9: each member's points are the counting charges they filed. `charges` oldest first.
 * `lead` = my points − partner's points.
 */
export function tally(
  charges: readonly { filerId: string; crime: string; status: ChargeStatus }[],
  meId: string,
  book: CrimeBook = CRIMES,
): { me: number; them: number; lead: number; meOwed: Owed; themOwed: Owed } {
  const meOwed: Owed = [];
  const themOwed: Owed = [];
  for (const c of charges) {
    if (!counts(c.status)) continue;
    const owed = c.filerId === meId ? meOwed : themOwed;
    const unit = crimeInfo(book, c.crime).unit;
    const row = owed.find((o) => o.unit === unit);
    if (row) row.count++;
    else owed.push({ unit, count: 1 });
  }
  const sum = (o: Owed): number => o.reduce((n, r) => n + r.count, 0);
  const me = sum(meOwed);
  const them = sum(themOwed);
  return { me, them, lead: me - them, meOwed, themOwed };
}

/**
 * spec §9: where the rope marker sits, in % of the track measured from my side.
 * `lead` = my points − partner's points; the marker moves toward whoever leads.
 */
export function ropePosition(lead: number): number {
  return 50 - Math.min(40, Math.max(-40, 7 * lead));
}
