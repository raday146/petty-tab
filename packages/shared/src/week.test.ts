import { describe, expect, it } from 'vitest';
import {
  checkProposedEnd,
  choreDaysDue,
  dayEnd,
  localDay,
  cycleAt,
  deadlineLabel,
  cycleEnd,
  reminderTime,
  sentenceDeadline,
} from './week.ts';

const tz = 'Asia/Jerusalem';
const at = (iso: string): Date => new Date(iso);

// 2026-10-18 and 2026-10-25 are Sundays. Israel is UTC+3 until 2026-10-25 02:00, then UTC+2.
describe('cycleEnd (spec §10)', () => {
  it('ends a new pair’s first cycle at the first Sunday 20:00 48 h later', () => {
    expect(cycleEnd(at('2026-10-12T10:00:00Z'), tz)).toEqual(at('2026-10-18T17:00:00Z')); // Monday
  });

  it('skips a Sunday less than 48 hours away, across the DST change', () => {
    expect(cycleEnd(at('2026-10-17T10:00:00Z'), tz)).toEqual(at('2026-10-25T18:00:00Z')); // Saturday
  });

  it('takes a Sunday exactly 48 hours away', () => {
    expect(cycleEnd(at('2026-10-16T17:00:00Z'), tz)).toEqual(at('2026-10-18T17:00:00Z')); // Friday 20:00
  });

  it('runs Sunday 20:00 to the next Sunday 20:00 after a normal verdict', () => {
    expect(cycleEnd(at('2026-10-18T17:00:00Z'), tz)).toEqual(at('2026-10-25T18:00:00Z'));
  });

  // Time travel: every zone turns over at its own Sunday 20:00, including the weeks its clocks change.
  const cases = [
    // [zone, partner joined, the Sunday 20:00 in UTC, the next one (across a DST change)]
    ['Asia/Jerusalem', '2026-10-12T10:00:00Z', '2026-10-18T17:00:00Z', '2026-10-25T18:00:00Z'],
    ['America/New_York', '2026-10-19T12:00:00Z', '2026-10-26T00:00:00Z', '2026-11-02T01:00:00Z'],
    ['Pacific/Auckland', '2026-09-14T00:00:00Z', '2026-09-20T08:00:00Z', '2026-09-27T07:00:00Z'],
    ['Pacific/Auckland', '2026-03-23T00:00:00Z', '2026-03-29T07:00:00Z', '2026-04-05T08:00:00Z'],
  ] as const;
  for (const [zone, joined, firstEnd, dstEnd] of cases) {
    it(`turns over at Sunday 20:00 in ${zone}, across the DST week (${dstEnd.slice(0, 10)})`, () => {
      expect(cycleEnd(at(joined), zone)).toEqual(at(firstEnd));
      expect(cycleEnd(at(firstEnd), zone)).toEqual(at(dstEnd));
    });
  }

  it('after a settle mid-week, runs to the first Sunday 20:00 at least 48 h away', () => {
    expect(cycleEnd(at('2026-10-21T09:00:00Z'), tz)).toEqual(at('2026-10-25T18:00:00Z')); // Wednesday
    expect(cycleEnd(at('2026-10-23T19:00:00Z'), tz)).toEqual(at('2026-11-01T18:00:00Z')); // Friday 22:00
  });
});

describe('checkProposedEnd (spec §10: a moved deadline)', () => {
  const now = at('2026-10-21T09:00:00Z');
  const h = (n: number): Date => new Date(now.getTime() + n * 60 * 60 * 1000);
  it('takes a time from 1 hour to 14 days ahead', () => {
    expect(checkProposedEnd(h(1), now)).toBeNull();
    expect(checkProposedEnd(h(14 * 24), now)).toBeNull();
  });
  it('refuses the past, the next hour and beyond 14 days', () => {
    expect(checkProposedEnd(h(-1), now)).toBe('too_soon');
    expect(checkProposedEnd(h(0.99), now)).toBe('too_soon');
    expect(checkProposedEnd(h(14 * 24 + 0.01), now)).toBe('too_far');
  });
});

describe('sentenceDeadline (spec §10: 24 hours after the verdict)', () => {
  it('is 24 hours after sealing, whatever the cycle', () => {
    expect(sentenceDeadline(at('2026-10-25T18:03:00Z'))).toEqual(at('2026-10-26T18:03:00Z'));
  });
});

describe('reminderTime (spec §12: the cycle’s halfway point)', () => {
  it('is halfway between the cycle’s start and end', () => {
    expect(reminderTime({ start: at('2026-10-18T17:00:00Z'), end: at('2026-10-25T18:00:00Z') })).toEqual(
      at('2026-10-22T05:30:00Z'),
    );
  });
});

describe('deadlineLabel', () => {
  it('reads the deadline in the pair’s timezone, weekday and 24-hour time', () => {
    expect(deadlineLabel(at('2026-10-25T18:00:00Z'), tz)).toBe('Sun 20:00');
    expect(deadlineLabel(at('2026-10-23T19:00:00Z'), 'America/New_York')).toBe('Fri 15:00');
  });
});

describe('cycleAt (spec §10: charges freeze at the deadline, before the sealer runs)', () => {
  const stored = { start: at('2026-10-21T09:00:00Z'), end: at('2026-10-23T19:00:00Z') };
  it('is the stored cycle until its end', () => {
    expect(cycleAt(stored, tz, at('2026-10-23T18:59:59Z'))).toEqual(stored);
  });
  it('rolls on to the default cycles that follow once the end has passed', () => {
    const next = { start: stored.end, end: at('2026-11-01T18:00:00Z') };
    expect(cycleAt(stored, tz, stored.end)).toEqual(next);
    expect(cycleAt(stored, tz, at('2026-11-01T18:00:00Z'))).toEqual({
      start: next.end,
      end: at('2026-11-08T18:00:00Z'),
    });
  });
});

describe('chore days (spec §8: a chore day ends at local midnight)', () => {
  it('reads the local date and its midnight, across the DST change', () => {
    expect(localDay(at('2026-10-24T21:30:00Z'), tz)).toBe('2026-10-25'); // 00:30 local
    expect(dayEnd('2026-10-24', tz)).toEqual(at('2026-10-24T21:00:00Z')); // UTC+3
    expect(dayEnd('2026-10-25', tz)).toEqual(at('2026-10-25T22:00:00Z')); // UTC+2
  });
  it('is due for the last two ended days after the creation day, oldest first', () => {
    const created = at('2026-10-20T12:00:00Z'); // Tuesday 15:00 local
    expect(choreDaysDue(created, tz, at('2026-10-20T22:00:00Z'))).toEqual([]); // Wednesday 01:00: Tue was creation day
    expect(choreDaysDue(created, tz, at('2026-10-21T21:00:00Z'))).toEqual(['2026-10-21']);
    expect(choreDaysDue(created, tz, at('2026-10-24T09:00:00Z'))).toEqual(['2026-10-22', '2026-10-23']);
  });
});

describe('cycleEnd with N-day cycles (spec §10: 20:00 local on day N)', () => {
  it('ends a 3-day or 5-day cycle at 20:00 on the Nth local day', () => {
    const monday = at('2026-10-12T10:00:00Z'); // 13:00 in Jerusalem
    expect(cycleEnd(monday, tz, 3)).toEqual(at('2026-10-15T17:00:00Z')); // Thursday 20:00
    expect(cycleEnd(monday, tz, 5)).toEqual(at('2026-10-17T17:00:00Z')); // Saturday 20:00
  });
  it('repeats every N days at 20:00, across the DST change', () => {
    const thursday = at('2026-10-22T17:00:00Z');
    expect(cycleEnd(thursday, tz, 3)).toEqual(at('2026-10-25T18:00:00Z')); // UTC+2 from the 25th
    expect(cycleEnd(at('2026-10-25T18:00:00Z'), tz, 3)).toEqual(at('2026-10-28T18:00:00Z'));
  });
  it('rolls an N-day cycle forward in cycleAt', () => {
    const stored = { start: at('2026-10-12T10:00:00Z'), end: at('2026-10-15T17:00:00Z') };
    expect(cycleAt(stored, tz, at('2026-10-16T09:00:00Z'), 3)).toEqual({
      start: stored.end,
      end: at('2026-10-18T17:00:00Z'),
    });
  });
});
