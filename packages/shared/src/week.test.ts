import { describe, expect, it } from 'vitest';
import { currentWeek } from './week.ts';

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
