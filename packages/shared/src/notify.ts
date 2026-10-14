import { z } from 'zod';
import { SPECIES, type Species } from '@petty-tab/art';
import { CRIMES, crimeInfo, SENTENCES, type CrimeBook, type SentenceKey } from './catalog.ts';
import { reminderTime } from './week.ts';

/** spec §12: charge pushes to the same person within this window go out as one. */
export const PUSH_BATCH_MS = 2 * 60 * 1000;

export type PushEvent =
  | { type: 'joined'; name: string; species: Species }
  | { type: 'plea.guilty'; name: string }
  | { type: 'plea.appeal'; name: string; title: string }
  | { type: 'appeal.upheld' | 'appeal.dropped'; name: string }
  | { type: 'verdict.won' | 'verdict.lost' | 'verdict.tie' }
  | { type: 'reminder'; name: string; sentenceKey: SentenceKey }
  | { type: 'settle.proposed'; name: string }
  | { type: 'chore.neglected'; title: string }
  | { type: 'move.proposed' | 'move.accepted'; name: string; when: string }
  | { type: 'proposal.declined'; name: string; settle: boolean };

/** The push texts of spec §12 (verdict texts from §10). `name` is the other member. */
export function pushText(e: PushEvent): string {
  switch (e.type) {
    case 'joined':
      return `${e.name} joined as ${SPECIES[e.species].name.replace('The', 'the')}.`;
    case 'plea.guilty':
      return `${e.name} owned it.`;
    case 'plea.appeal':
      return `${e.name} cries foul: ${e.title}. Your call.`;
    case 'appeal.upheld':
      return `${e.name} says nice try. It counts.`;
    case 'appeal.dropped':
      return `${e.name} let it slide.`;
    case 'verdict.won':
      return 'You won the week. Gloat responsibly.';
    case 'verdict.lost':
      return 'The verdict is in.';
    case 'verdict.tie':
      return 'Dead even this week. Suspiciously wholesome.';
    case 'reminder':
      // Default wording (spec §12 gives none), flagged in plan.md M6.
      return `You still owe ${e.name}: ${SENTENCES[e.sentenceKey].title}.`;
    case 'chore.neglected':
      return `${e.title} didn't happen yesterday. It's on the tab.`;
    case 'settle.proposed':
      return `${e.name} wants to settle the tab right now! Ready to face the verdict?`;
    case 'move.proposed':
      return `${e.name} is moving the goalposts: verdict ${e.when}. Deal?`;
    case 'proposal.declined':
      return `${e.name} says ${e.settle ? 'not yet' : 'nope'}.`;
    case 'move.accepted':
      return `${e.name} agreed. Verdict ${e.when}.`;
  }
}

/** spec §12: one charge, or the charges batched into one push (the batch wording is an M6 default). */
export function chargePushText(filer: string, crimes: string[], book: CrimeBook = CRIMES): string {
  const titles = crimes.map((k) => crimeInfo(book, k).title);
  if (titles.length === 1) return `${filer} filed: ${titles[0]}.`;
  const named =
    titles.length === 2
      ? titles.join(' and ')
      : `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`;
  return `${filer} filed ${titles.length} charges: ${named}.`;
}

/**
 * spec §12: the loser's reminder is due once per cycle, from the cycle's halfway point until it ends, while
 * the sentence is unconfirmed. `cycle` is the pair's current cycle; a halfway point before the seal is skipped.
 */
export function reminderDue(
  sealedAt: Date,
  remindedAt: Date | null,
  cycle: { start: Date; end: Date },
  now: Date,
): boolean {
  const halfway = reminderTime(cycle);
  return halfway > sealedAt && now >= halfway && (!remindedAt || remindedAt < cycle.start);
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
