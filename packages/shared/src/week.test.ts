import { describe, expect, it } from 'vitest';
import { currentWeek, endedWeeks, sentenceDeadline } from './week.ts';

const tz = 'Asia/Jerusalem';
const at = (iso: string): Date => new Date(iso);

// 2026-10-18 and 2026-10-25 are Sundays. Israel is UTC+3 until 2026-10-25 02:00, then UTC+2.
describe('currentWeek (spec §10)', () => {
  it('starts the first week when the partner joins and ends it at the first Sunday 20:00 48 h later', () => {
    const joined = at('2026-10-12T10:00:00Z'); // Monday
    expect(currentWeek(joined, tz, at('2026-10-13T00:00:00Z'))).toEqual({
      start: joined,
      end: at('2026-10-18T17:00:00Z'),
    });
  });

  it('skips a Sunday less than 48 hours away, across the DST change', () => {
    const joined = at('2026-10-17T10:00:00Z'); // Saturday
    expect(currentWeek(joined, tz, joined)).toEqual({ start: joined, end: at('2026-10-25T18:00:00Z') });
  });

  it('takes a Sunday exactly 48 hours away', () => {
    const joined = at('2026-10-16T17:00:00Z'); // Friday 20:00 local
    expect(currentWeek(joined, tz, joined).end).toEqual(at('2026-10-18T17:00:00Z'));
  });

  it('runs later weeks Sunday 20:00 to Sunday 20:00 local', () => {
    const joined = at('2026-10-12T10:00:00Z');
    const week = { start: at('2026-10-18T17:00:00Z'), end: at('2026-10-25T18:00:00Z') };
    expect(currentWeek(joined, tz, at('2026-10-18T17:00:00Z'))).toEqual(week);
    expect(currentWeek(joined, tz, at('2026-10-21T09:00:00Z'))).toEqual(week);
    expect(currentWeek(joined, tz, at('2026-10-25T18:00:00Z')).start).toEqual(week.end);
  });
});

// Time travel: every zone seals at its own Sunday 20:00, including the weeks its clocks change.
describe('endedWeeks (spec §10 sealing)', () => {
  const cases = [
    // [zone, partner joined, the Sunday 20:00 in UTC, the next one (across a DST change)]
    ['Asia/Jerusalem', '2026-10-12T10:00:00Z', '2026-10-18T17:00:00Z', '2026-10-25T18:00:00Z'],
    ['America/New_York', '2026-10-19T12:00:00Z', '2026-10-26T00:00:00Z', '2026-11-02T01:00:00Z'],
    ['Pacific/Auckland', '2026-09-14T00:00:00Z', '2026-09-20T08:00:00Z', '2026-09-27T07:00:00Z'],
    ['Pacific/Auckland', '2026-03-23T00:00:00Z', '2026-03-29T07:00:00Z', '2026-04-05T08:00:00Z'],
  ] as const;

  for (const [zone, joinedIso, firstEndIso, dstEndIso] of cases) {
    it(`seals at Sunday 20:00 in ${zone}, across the DST week (${dstEndIso.slice(0, 10)})`, () => {
      const joined = at(joinedIso);
      const firstEnd = at(firstEndIso);
      const dstEnd = at(dstEndIso);
      const second = (t: Date, s: number): Date => new Date(t.getTime() + s * 1000);

      expect(endedWeeks(joined, zone, joined, second(firstEnd, -1))).toEqual([]);
      expect(endedWeeks(joined, zone, joined, firstEnd)).toEqual([{ start: joined, end: firstEnd }]);
      expect(endedWeeks(joined, zone, firstEnd, second(dstEnd, -1))).toEqual([]);
      expect(endedWeeks(joined, zone, firstEnd, dstEnd)).toEqual([{ start: firstEnd, end: dstEnd }]);
      // A sealer that was down for both weeks catches up on both, oldest first.
      expect(endedWeeks(joined, zone, joined, second(dstEnd, 60))).toEqual([
        { start: joined, end: firstEnd },
        { start: firstEnd, end: dstEnd },
      ]);
    });
  }
});

describe('sentenceDeadline (spec §10: Monday 20:00 local)', () => {
  it('is the Monday 20:00 after the week ends', () => {
    expect(sentenceDeadline(at('2026-10-25T18:00:00Z'), tz)).toEqual(at('2026-10-26T18:00:00Z'));
    expect(sentenceDeadline(at('2026-11-02T01:00:00Z'), 'America/New_York')).toEqual(
      at('2026-11-03T01:00:00Z'),
    );
  });
});
