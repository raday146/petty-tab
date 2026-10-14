import { describe, expect, it } from 'vitest';
import { chargePushText, pushSubscriptionBody, pushText, reminderDue } from './notify.ts';

const at = (iso: string): Date => new Date(iso);

describe('pushText (spec §12, §10)', () => {
  it('words every event as the spec does', () => {
    expect(pushText({ type: 'joined', name: 'Alex', species: 'cat' })).toBe('Alex joined as the Judgy Cat.');
    expect(pushText({ type: 'plea.guilty', name: 'Alex' })).toBe('Alex owned it.');
    expect(pushText({ type: 'plea.appeal', name: 'Alex', title: 'Trash Jenga' })).toBe(
      'Alex cries foul: Trash Jenga. Your call.',
    );
    expect(pushText({ type: 'appeal.upheld', name: 'Maya' })).toBe('Maya says nice try. It counts.');
    expect(pushText({ type: 'appeal.dropped', name: 'Maya' })).toBe('Maya let it slide.');
    expect(pushText({ type: 'verdict.won' })).toBe('You won the week. Gloat responsibly.');
    expect(pushText({ type: 'verdict.lost' })).toBe('The verdict is in.');
    expect(pushText({ type: 'verdict.tie' })).toBe('Dead even this week. Suspiciously wholesome.');
    expect(pushText({ type: 'reminder', name: 'Maya', sentenceKey: 'coffee7' })).toBe(
      'You still owe Maya: 7 days of morning coffee duty.',
    );
    expect(pushText({ type: 'chore.neglected', title: 'Dishes duty' })).toBe(
      "Dishes duty didn't happen yesterday. It's on the tab.",
    );
    expect(pushText({ type: 'settle.proposed', name: 'Maya' })).toBe(
      'Maya wants to settle the tab right now! Ready to face the verdict?',
    );
    expect(pushText({ type: 'move.proposed', name: 'Maya', when: 'Fri 21:00' })).toBe(
      'Maya is moving the goalposts: verdict Fri 21:00. Deal?',
    );
    expect(pushText({ type: 'proposal.declined', name: 'Alex', settle: true })).toBe('Alex says not yet.');
    expect(pushText({ type: 'proposal.declined', name: 'Alex', settle: false })).toBe('Alex says nope.');
    expect(pushText({ type: 'move.accepted', name: 'Alex', when: 'Fri 21:00' })).toBe(
      'Alex agreed. Verdict Fri 21:00.',
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

describe('reminderDue (spec §12: once per cycle, from its halfway point)', () => {
  const sealed = at('2026-10-18T17:05:00Z');
  const cycle = { start: at('2026-10-18T17:00:00Z'), end: at('2026-10-25T18:00:00Z') }; // halfway 22 Oct 05:30Z

  it('is due from the halfway point, not a second before, and catches up until the cycle ends', () => {
    expect(reminderDue(sealed, null, cycle, at('2026-10-22T05:29:59Z'))).toBe(false);
    expect(reminderDue(sealed, null, cycle, at('2026-10-22T05:30:00Z'))).toBe(true);
    expect(reminderDue(sealed, null, cycle, at('2026-10-25T17:59:00Z'))).toBe(true);
  });

  it('is sent once per cycle, and again in the next one', () => {
    const sent = at('2026-10-22T05:40:00Z');
    expect(reminderDue(sealed, sent, cycle, at('2026-10-24T00:00:00Z'))).toBe(false);
    const next = { start: cycle.end, end: at('2026-11-01T18:00:00Z') };
    expect(reminderDue(sealed, sent, next, at('2026-10-29T06:00:00Z'))).toBe(true);
  });

  it('skips a halfway point that came before the verdict was sealed', () => {
    expect(reminderDue(at('2026-10-23T00:00:00Z'), null, cycle, at('2026-10-23T01:00:00Z'))).toBe(false);
  });
});

describe('pushSubscriptionBody', () => {
  const keys = { p256dh: 'BNc', auth: 'tBH' };
  it('accepts the browser push services', () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://web.push.apple.com/QGx',
      'https://updates.push.services.mozilla.com/wpush/v2/x',
      'https://wns2-db5p.notify.windows.com/w/?token=x',
    ]) {
      expect(pushSubscriptionBody.safeParse({ endpoint, keys }).success).toBe(true);
    }
  });

  it('refuses any other host, plain http and look-alikes', () => {
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://localhost:3001/api/charges',
      'https://169.254.169.254/latest',
      'https://fcm.googleapis.com.evil.example/x',
      'https://evilfcm.googleapis.com/x',
    ]) {
      expect(pushSubscriptionBody.safeParse({ endpoint, keys }).success).toBe(false);
    }
  });
});
