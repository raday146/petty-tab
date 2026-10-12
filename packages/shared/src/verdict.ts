import { z } from 'zod';
import type { Species } from '@petty-tab/art';
import { CRIME_KEYS, SENTENCE_KEYS, type ChargeStatus, type CrimeKey, type SentenceKey } from './catalog.ts';
import { nameSchema, speciesSchema } from './identity.ts';
import { rng } from './rng.ts';
import { counts, tally } from './score.ts';

export type TopCrime = { crime: CrimeKey; count: number };

/**
 * spec §10 steps 2–4, on the statuses sealing persists (pending counts as guilty, appealed as dropped, so
 * §8's `counts()` already gives the sealed result). `members` in join order: a tie keeps that order.
 * `points` are winner first. Top crimes are crime keys, never sticker keys.
 */
export function judge(
  charges: readonly { filerId: string; crime: CrimeKey; status: ChargeStatus; createdAt: Date }[],
  members: readonly [string, string],
): { tie: boolean; winnerId: string; loserId: string; points: [number, number]; topCrimes: TopCrime[] } {
  const { me, them } = tally(charges, members[0]);
  const [winnerId, loserId] = me >= them ? members : [members[1], members[0]];
  if (me === them) return { tie: true, winnerId, loserId, points: [me, them], topCrimes: [] };

  const against = new Map<CrimeKey, { count: number; latest: number }>();
  for (const c of charges) {
    if (c.filerId !== winnerId || !counts(c.status)) continue;
    const row = against.get(c.crime) ?? { count: 0, latest: 0 };
    against.set(c.crime, { count: row.count + 1, latest: Math.max(row.latest, c.createdAt.getTime()) });
  }
  const topCrimes = [...against]
    .sort(([, a], [, b]) => b.count - a.count || b.latest - a.latest)
    .slice(0, 3)
    .map(([crime, { count }]) => ({ crime, count }));
  return { tie: false, winnerId, loserId, points: [Math.max(me, them), Math.min(me, them)], topCrimes };
}

/** spec §10 step 5: the pre-selected sentence, seeded by the verdict id (FNV-1a) so renders repeat. */
export function seedSentence(verdictId: string): SentenceKey {
  let h = 0x811c9dc5;
  for (let i = 0; i < verdictId.length; i++) h = Math.imul(h ^ verdictId.charCodeAt(i), 0x01000193);
  return SENTENCE_KEYS[Math.floor(rng(h)() * SENTENCE_KEYS.length)]!;
}

/** spec §10: locked at the winner's first share or at Monday 20:00 (`deadline`), whichever comes first. */
export function sentenceLocked(sentenceLockedAt: Date | null, deadline: Date, now: Date): boolean {
  return sentenceLockedAt !== null || now >= deadline;
}

export const sentenceBody = z.object({
  sentenceKey: z.enum(SENTENCE_KEYS as [SentenceKey, ...SentenceKey[]]),
});

const renderMember = z.object({ name: nameSchema, species: speciesSchema });

/** What a card or reel render is drawn from: the render job's payload and the render routes' input (spec §11). */
export const renderInput = z.object({
  winner: renderMember,
  loser: renderMember,
  tie: z.boolean(),
  topCrimes: z
    .array(
      z.object({
        crime: z.enum(CRIME_KEYS as [CrimeKey, ...CrimeKey[]]),
        count: z.number().int().positive(),
      }),
    )
    .max(3),
  sentence: z.enum(SENTENCE_KEYS as [SentenceKey, ...SentenceKey[]]).nullable(),
});
export type RenderInput = z.output<typeof renderInput>;

/** `GET /api/verdicts/:id`: names winner first; on a tie, join order (spec §10). */
export interface VerdictView {
  id: string;
  viewer: 'winner' | 'loser';
  winner: { name: string; species: Species };
  loser: { name: string; species: Species };
  tie: boolean;
  topCrimes: TopCrime[];
  sentence: SentenceKey | null;
  locked: boolean;
  served: boolean;
  confirmed: boolean;
}

/** What the verdict stores so later renames never change it (spec §10 step 6). */
export interface VerdictSnapshot {
  winner: { name: string; species: Species; points: number };
  loser: { name: string; species: Species; points: number };
  topCrimes: TopCrime[];
}
