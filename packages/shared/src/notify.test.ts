import { describe, expect, it } from 'vitest';
import { chargePushText, pushText, reminderDue } from './notify.ts';

const at = (iso: string): Date => new Date(iso);

describe('pushText (spec §12, §10)', () => {
  it('words every event as the spec does', () => {
    expect(pushText({ type: 'joined', name: 'Alex', species: 'cat' })).toBe('Alex joined as the Judgy Cat.');
    expect(pushText({ type: 'plea.guilty', name: 'Alex' })).toBe('Alex pleads guilty.');
    expect(pushText({ type: 'plea.appeal', name: 'Alex', crimeKey: 'trash' })).toBe(
      'Alex appeals: Trash Jenga. Your call.',
    );
    expect(pushText({ type: 'appeal.upheld', name: 'Maya' })).toBe('Maya upheld it.');
    expect(pushText({ type: 'appeal.dropped', name: 'Maya' })).toBe('Maya dropped it.');
    expect(pushText({ type: 'verdict.won' })).toBe('Court is adjourned. You won the week.');
    expect(pushText({ type: 'verdict.lost' })).toBe('The verdict is in.');
    expect(pushText({ type: 'verdict.tie' })).toBe('Dead even this week. The court is impressed.');
    expect(pushText({ type: 'reminder', name: 'Maya', sentenceKey: 'coffee7' })).toBe(
      'You still owe Maya: 7 days of morning coffee duty.',
    );
  });
});

describe('chargePushText (spec §12 batching)', () => {
  it('names one charge', () => {
    expect(chargePushText('Maya', ['trash'])).toBe('Maya filed: Trash Jenga.');
  });

  it('batches two and three charges', () => {
    expect(chargePushText('Maya', ['trash', 'sip'])).toBe(
      'Maya filed 2 charges: Trash Jenga and The Phantom Sip.',
    );
    expect(chargePushText('Maya', ['trash', 'sip', 'trash'])).toBe(
      'Maya filed 3 charges: Trash Jenga, The Phantom Sip and 1 more.',
    );
  });
});

// 2026-10-21 is a Wednesday. Jerusalem is UTC+3 then; New York UTC-4; Auckland UTC+13.
describe('reminderDue (spec §12: Wednesday 19:00 local)', () => {
  const sealed = at('2026-10-18T17:05:00Z'); // Sunday after 20:00 Jerusalem

  it('is due from Wednesday 19:00 local, not a second before', () => {
    expect(reminderDue(sealed, null, 'Asia/Jerusalem', at('2026-10-21T15:59:59Z'))).toBe(false);
    expect(reminderDue(sealed, null, 'Asia/Jerusalem', at('2026-10-21T16:00:00Z'))).toBe(true);
    expect(reminderDue(sealed, null, 'America/New_York', at('2026-10-21T23:00:00Z'))).toBe(true);
    expect(reminderDue(sealed, null, 'America/New_York', at('2026-10-21T22:59:00Z'))).toBe(false);
    expect(
      reminderDue(at('2026-10-18T07:05:00Z'), null, 'Pacific/Auckland', at('2026-10-21T06:00:00Z')),
    ).toBe(true);
  });

  it('is sent once per Wednesday, and again the next Wednesday', () => {
    const sent = at('2026-10-21T16:10:00Z');
    expect(reminderDue(sealed, sent, 'Asia/Jerusalem', at('2026-10-21T16:20:00Z'))).toBe(false);
    // The next Wednesday is after the DST change: 19:00 local is 17:00 UTC.
    expect(reminderDue(sealed, sent, 'Asia/Jerusalem', at('2026-10-28T16:59:00Z'))).toBe(false);
    expect(reminderDue(sealed, sent, 'Asia/Jerusalem', at('2026-10-28T17:00:00Z'))).toBe(true);
  });

  it('catches up within a day, then waits for the next Wednesday', () => {
    expect(reminderDue(sealed, null, 'Asia/Jerusalem', at('2026-10-22T15:59:00Z'))).toBe(true);
    expect(reminderDue(sealed, null, 'Asia/Jerusalem', at('2026-10-22T16:00:00Z'))).toBe(false);
  });

  it('skips a Wednesday that came before the verdict was sealed', () => {
    const late = at('2026-10-21T17:00:00Z');
    expect(reminderDue(late, null, 'Asia/Jerusalem', at('2026-10-21T18:00:00Z'))).toBe(false);
  });
});
