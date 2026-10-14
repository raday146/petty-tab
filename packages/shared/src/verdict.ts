import { z } from 'zod';
import type { Species } from '@petty-tab/art';
import {
  CRIMES,
  crimeInfo,
  isCustomKey,
  SENTENCE_KEYS,
  stickerSchema,
  type ChargeStatus,
  type CrimeBook,
  type SentenceKey,
  type TopCrime,
} from './catalog.ts';
import { nameSchema, speciesSchema } from './identity.ts';
import { rng } from './rng.ts';
import { counts, tally } from './score.ts';

export type { TopCrime };

/**
 * spec §10 steps 2–4, on the statuses sealing persists (pending counts as guilty, appealed as dropped, so
 * §8's `counts()` already gives the sealed result). `members` in join order: a tie keeps that order.
 * `points` are winner first. Top crimes are crime keys, never sticker keys; a custom crime also keeps its
 * title and sticker, so the verdict never changes when the pair removes it.
 */
export function judge(
  charges: readonly { filerId: string; crime: string; status: ChargeStatus; createdAt: Date }[],
  members: readonly [string, string],
  book: CrimeBook = CRIMES,
): { tie: boolean; winnerId: string; loserId: string; points: [number, number]; topCrimes: TopCrime[] } {
  const { me, them } = tally(charges, members[0], book);
  const [winnerId, loserId] = me >= them ? members : [members[1], members[0]];
  if (me === them) return { tie: true, winnerId, loserId, points: [me, them], topCrimes: [] };

  const against = new Map<string, { count: number; latest: number }>();
  for (const c of charges) {
    if (c.filerId !== winnerId || !counts(c.status)) continue;
    const row = against.get(c.crime) ?? { count: 0, latest: 0 };
    against.set(c.crime, { count: row.count + 1, latest: Math.max(row.latest, c.createdAt.getTime()) });
  }
  const topCrimes = [...against]
    .sort(([, a], [, b]) => b.count - a.count || b.latest - a.latest)
    .slice(0, 3)
    .map(([crime, { count }]): TopCrime => {
      if (!isCustomKey(crime)) return { crime, count };
      const { title, sticker } = crimeInfo(book, crime);
      return { crime, count, title, sticker };
    });
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
      z
        .object({
          crime: z.string().max(60),
          count: z.number().int().positive(),
          title: z.string().min(1).max(40).optional(),
          sticker: stickerSchema.optional(),
        })
        // A catalog key alone, or any key with the title and sticker it was sealed with.
        .refine((t) => t.crime in CRIMES || (t.title && t.sticker), 'Unknown crime.'),
    )
    .max(3),
  sentence: z.enum(SENTENCE_KEYS as [SentenceKey, ...SentenceKey[]]).nullable(),
});
export type RenderInput = z.output<typeof renderInput>;

export type RenderKind = 'card' | 'reel';

/** What the render routes of apps/web expose to apps/renderer. */
declare global {
  interface Window {
    /** Validates the input (renderInput) and resolves once it is drawn with its fonts loaded. */
    __render?: (input: unknown) => Promise<void>;
    /** Reel only: one frame at t (resolves after it is painted), and the soundtrack as base64 WAV. */
    __reel?: { seek: (t: number) => Promise<void>; wav: () => Promise<string> };
  }
}

/** Where a render lands in storage. The sentence is in the key, so a new sentence never serves a stale file. */
export const renderKey = (verdictId: string, kind: RenderKind, sentence: SentenceKey | null): string =>
  `verdicts/${verdictId}/${kind}-${sentence ?? 'tie'}.${kind === 'card' ? 'png' : 'mp4'}`;

/** pg-boss queue names shared by apps/api and apps/renderer. */
export const RENDER_QUEUES = { render: 'render', rendered: 'rendered' } as const;

/** The `render` job (api → renderer) and the `rendered` job (renderer → api) of spec §11. */
export interface RenderJob {
  verdictId: string;
  kind: RenderKind;
  key: string;
  input: RenderInput;
}
export type RenderedJob = Omit<RenderJob, 'input'>;

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
  /** The card PNG / reel MP4 of the current sentence is ready at `/api/verdicts/:id/card|reel`. */
  card: boolean;
  reel: boolean;
}

/** What the verdict stores so later renames never change it (spec §10 step 6). */
export interface VerdictSnapshot {
  winner: { name: string; species: Species; points: number };
  loser: { name: string; species: Species; points: number };
  topCrimes: TopCrime[];
}
