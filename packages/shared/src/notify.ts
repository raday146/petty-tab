import { z } from 'zod';
import { SPECIES, type Species } from '@petty-tab/art';
import { CRIMES, SENTENCES, type CrimeKey, type SentenceKey } from './catalog.ts';
import { lastReminderTime } from './week.ts';

/** spec §12: charge pushes to the same person within this window go out as one. */
export const PUSH_BATCH_MS = 2 * 60 * 1000;
const CATCH_UP_MS = 24 * 60 * 60 * 1000;

export type PushEvent =
  | { type: 'joined'; name: string; species: Species }
  | { type: 'plea.guilty'; name: string }
  | { type: 'plea.appeal'; name: string; crimeKey: CrimeKey }
  | { type: 'appeal.upheld' | 'appeal.dropped'; name: string }
  | { type: 'verdict.won' | 'verdict.lost' | 'verdict.tie' }
  | { type: 'reminder'; name: string; sentenceKey: SentenceKey };

/** The push texts of spec §12 (verdict texts from §10). `name` is the other member. */
export function pushText(e: PushEvent): string {
  switch (e.type) {
    case 'joined':
      return `${e.name} joined as ${SPECIES[e.species].name.replace('The', 'the')}.`;
    case 'plea.guilty':
      return `${e.name} pleads guilty.`;
    case 'plea.appeal':
      return `${e.name} appeals: ${CRIMES[e.crimeKey].title}. Your call.`;
    case 'appeal.upheld':
      return `${e.name} upheld it.`;
    case 'appeal.dropped':
      return `${e.name} dropped it.`;
    case 'verdict.won':
      return 'Court is adjourned. You won the week.';
    case 'verdict.lost':
      return 'The verdict is in.';
    case 'verdict.tie':
      return 'Dead even this week. The court is impressed.';
    case 'reminder':
      // Default wording (spec §12 gives none), flagged in plan.md M6.
      return `You still owe ${e.name}: ${SENTENCES[e.sentenceKey].title}.`;
  }
}

/** spec §12: one charge, or the charges batched into one push (the batch wording is an M6 default). */
export function chargePushText(filer: string, crimes: CrimeKey[]): string {
  const titles = crimes.map((k) => CRIMES[k].title);
  if (titles.length === 1) return `${filer} filed: ${titles[0]}.`;
  const named =
    titles.length === 2
      ? titles.join(' and ')
      : `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`;
  return `${filer} filed ${titles.length} charges: ${named}.`;
}

/**
 * spec §12: the loser's reminder is due from Wednesday 19:00 local while the sentence is unconfirmed, once
 * per Wednesday, for Wednesdays after the seal. A sweep that was down catches up within a day.
 */
export function reminderDue(sealedAt: Date, remindedAt: Date | null, tz: string, now: Date): boolean {
  const wednesday = lastReminderTime(tz, now);
  return (
    wednesday > sealedAt &&
    now.getTime() - wednesday.getTime() < CATCH_UP_MS &&
    (!remindedAt || remindedAt < wednesday)
  );
}

/**
 * The browser push services. The API POSTs to the endpoint it is given, so only these hosts are accepted
 * (no requests to arbitrary or internal URLs).
 */
const PUSH_HOSTS =
  /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//;

/** spec §14: `POST /push/subscriptions` and `DELETE /push/subscriptions` (endpoint only). */
export const pushSubscriptionBody = z.object({
  endpoint: z.url().max(1000).regex(PUSH_HOSTS, 'Not a push service.'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export const pushEndpointBody = pushSubscriptionBody.pick({ endpoint: true });
