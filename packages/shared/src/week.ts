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

/** The instant when the wall clock in `tz` reads day `d` (may overflow the month) at 20:00. */
function turnover(y: number, m: number, d: number, tz: string): Date {
  const local = Date.UTC(y, m - 1, d, TURNOVER_HOUR);
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
 * spec §10: where a cycle that starts at `start` ends by default: the first Sunday 20:00 in `tz` at least
 * 48 hours later. A new pair's first week, the week after every verdict, and the one after a settle.
 */
export function firstCycleEnd(start: Date, tz: string): Date {
  return nextTurnover(new Date(start.getTime() + MIN_CYCLE_MS), tz);
}

/**
 * spec §10: the cycle `now` falls in. The pair stores its current cycle; once that has ended (the sealer
 * runs every 5 minutes) the default cycles that follow it apply, so nothing lands in an ended cycle.
 */
export function cycleAt(
  stored: { start: Date; end: Date },
  tz: string,
  now: Date,
): { start: Date; end: Date } {
  let cycle = stored;
  while (cycle.end <= now) cycle = { start: cycle.end, end: firstCycleEnd(cycle.end, tz) };
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
