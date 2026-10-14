/** spec §10: by default a cycle turns over at Sunday 20:00 in the pair's timezone. */
const TURNOVER_HOUR = 20;
const MIN_CYCLE_MS = 48 * 60 * 60 * 1000;

/** The wall-clock date and time of `t` in `tz`. */
function wall(t: Date, tz: string): { y: number; m: number; d: number; ms: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(t);
  const n = (type: string): number => Number(parts.find((p) => p.type === type)!.value);
  const [y, m, d] = [n('year'), n('month'), n('day')];
  return { y, m, d, ms: Date.UTC(y, m - 1, d, n('hour'), n('minute'), n('second')) };
}

/** The instant when the wall clock in `tz` reads day `d` (may overflow the month) at `hour` (20:00). */
function turnover(y: number, m: number, d: number, tz: string, hour = TURNOVER_HOUR): Date {
  const local = Date.UTC(y, m - 1, d, hour);
  // Guess with the offset at the local time read as UTC, then correct once with the offset at the guess.
  const offsetAt = (t: number): number => wall(new Date(t), tz).ms - Math.floor(t / 1000) * 1000;
  const guess = local - offsetAt(local);
  return new Date(local - offsetAt(guess));
}

/** The first Sunday 20:00 in `tz` at or after `t`. */
function nextTurnover(t: Date, tz: string): Date {
  const { y, m, d } = wall(t, tz);
  const sunday = d + ((7 - new Date(Date.UTC(y, m - 1, d)).getUTCDay()) % 7);
  const candidate = turnover(y, m, sunday, tz);
  return candidate < t ? turnover(y, m, sunday + 7, tz) : candidate;
}

/**
 * spec §10: where a cycle that starts at `start` ends by the pair's rule. Weekly (`cycleDays` null): the first
 * Sunday 20:00 in `tz` at least 48 hours later. Every N days: 20:00 on the Nth local day after `start`.
 * Used for a new pair's first cycle, the cycle after every verdict, and the one after a settle.
 */
export function cycleEnd(start: Date, tz: string, cycleDays: number | null = null): Date {
  if (cycleDays === null) return nextTurnover(new Date(start.getTime() + MIN_CYCLE_MS), tz);
  const { y, m, d } = wall(start, tz);
  return turnover(y, m, d + cycleDays, tz);
}

/** spec §10: the cycle lengths a pair can pick besides weekly. */
export const CYCLE_DAYS = [3, 5] as const;
export type CycleDays = (typeof CYCLE_DAYS)[number] | null;

/**
 * spec §10: the cycle `now` falls in. The pair stores its current cycle; once that has ended (the sealer
 * runs every 5 minutes) the default cycles that follow it apply, so nothing lands in an ended cycle.
 */
export function cycleAt(
  stored: { start: Date; end: Date },
  tz: string,
  now: Date,
  cycleDays: number | null = null,
): { start: Date; end: Date } {
  let cycle = stored;
  while (cycle.end <= now) cycle = { start: cycle.end, end: cycleEnd(cycle.end, tz, cycleDays) };
  return cycle;
}

const HOUR = 60 * 60 * 1000;
/** spec §10: a moved deadline lands at least an hour and at most 14 days ahead. */
export function checkProposedEnd(end: Date, now: Date): 'too_soon' | 'too_far' | null {
  const ahead = end.getTime() - now.getTime();
  return ahead < HOUR ? 'too_soon' : ahead > 14 * 24 * HOUR ? 'too_far' : null;
}

/** spec §10: the winner can change the sentence for 24 hours after the verdict (or until the first share). */
export function sentenceDeadline(sealedAt: Date): Date {
  return new Date(sealedAt.getTime() + 24 * HOUR);
}

/** spec §12: the sentence reminder goes out at the halfway point of each cycle after the verdict. */
export function reminderTime(cycle: { start: Date; end: Date }): Date {
  return new Date((cycle.start.getTime() + cycle.end.getTime()) / 2);
}

/** The deadline as the tab shows it, in the pair's timezone: "Sun 20:00". */
export function deadlineLabel(end: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(end)
    .replace(',', '');
}

const iso = (y: number, m: number, d: number): string =>
  new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** spec §8: the local date of `t` in `tz`, "2026-10-25". A chore's day. */
export function localDay(t: Date, tz: string): string {
  const { y, m, d } = wall(t, tz);
  return iso(y, m, d);
}

/** spec §8: when the chore day `day` ends: the local midnight after it. */
export function dayEnd(day: string, tz: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return turnover(y, m, d + 1, tz, 0);
}

/**
 * spec §8: the chore days to check at `now`: the last two ended days, oldest first, never the creation day or
 * before. Two, so a sweep that was down over one midnight still catches up.
 */
export function choreDaysDue(createdAt: Date, tz: string, now: Date): string[] {
  const first = localDay(createdAt, tz);
  const { y, m, d } = wall(now, tz);
  return [iso(y, m, d - 2), iso(y, m, d - 1)].filter((day) => day > first);
}
