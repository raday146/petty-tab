/** spec §10: weeks turn over at Sunday 20:00 in the pair's timezone. */
const TURNOVER_HOUR = 20;
const FIRST_WEEK_MIN_MS = 48 * 60 * 60 * 1000;

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

/** The first Sunday 20:00 in `tz` at or after `t` (`strict`: after). */
function nextTurnover(t: Date, tz: string, strict: boolean): Date {
  const { y, m, d } = wall(t, tz);
  const sunday = d + ((7 - new Date(Date.UTC(y, m - 1, d)).getUTCDay()) % 7);
  const candidate = turnover(y, m, sunday, tz);
  const late = strict ? candidate <= t : candidate < t;
  return late ? turnover(y, m, sunday + 7, tz) : candidate;
}

/**
 * spec §10: the week `now` falls in. The first week runs from `firstWeekStart` (the second member's join)
 * to the first Sunday 20:00 at least 48 hours later; after it, Sunday 20:00 to Sunday 20:00 local.
 */
export function currentWeek(firstWeekStart: Date, tz: string, now: Date): { start: Date; end: Date } {
  const firstEnd = nextTurnover(new Date(firstWeekStart.getTime() + FIRST_WEEK_MIN_MS), tz, false);
  if (now < firstEnd) return { start: firstWeekStart, end: firstEnd };
  const end = nextTurnover(now, tz, true);
  const { y, m, d } = wall(end, tz);
  return { start: turnover(y, m, d - 7, tz), end };
}

/** spec §10: every week of the pair that ended by `now` and starts at or after `after`, oldest first. */
export function endedWeeks(
  firstWeekStart: Date,
  tz: string,
  after: Date,
  now: Date,
): { start: Date; end: Date }[] {
  const weeks = [];
  for (
    let w = currentWeek(firstWeekStart, tz, after);
    w.end <= now;
    w = currentWeek(firstWeekStart, tz, w.end)
  ) {
    if (w.start >= after) weeks.push(w);
  }
  return weeks;
}

/** spec §10 / Open decision 5: the winner can change the sentence until the Monday 20:00 after `weekEnd`. */
export function sentenceDeadline(weekEnd: Date, tz: string): Date {
  const { y, m, d } = wall(weekEnd, tz);
  return turnover(y, m, d + 1, tz);
}
