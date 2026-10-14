import { z } from 'zod';
import { STICKERS, type IconName, type StickerKey } from '@petty-tab/art';

/** spec §6: the three currencies a charge adds to the tab. */
export const UNITS = {
  coffee: { icon: 'mug', one: 'coffee', many: 'coffees' },
  dish: { icon: 'dish', one: 'dish load', many: 'dish loads' },
  foot: { icon: 'foot', one: 'foot rub', many: 'foot rubs' },
} as const satisfies Record<string, { icon: IconName; one: string; many: string }>;

export type UnitKey = keyof typeof UNITS;

/** "+1 coffee" for one charge, "4 coffees" for a total. */
export function unitLabel(unit: UnitKey, count?: number): string {
  const u = UNITS[unit];
  if (count === undefined) return `+1 ${u.one}`;
  return `${count} ${count === 1 ? u.one : u.many}`;
}

export interface CrimeInfo {
  title: string;
  description: string;
  /** Draw with this, never with the crime key (`dj` draws as `tape`). */
  sticker: StickerKey;
  unit: UnitKey;
}

/** spec §6, in picker order. */
export const CRIMES = {
  sip: {
    title: 'The Phantom Sip',
    description: 'Left a carton with three drops of milk in the fridge.',
    sticker: 'sip',
    unit: 'coffee',
  },
  trash: {
    title: 'Trash Jenga',
    description: 'Piled the trash to the ceiling instead of taking the bag out.',
    sticker: 'trash',
    unit: 'dish',
  },
  dish: {
    title: 'Dishwasher Terrorism',
    description: 'Loaded the dishwasher like an abstract puzzle.',
    sticker: 'dish',
    unit: 'dish',
  },
  movie: {
    title: 'Asleep at Minute Four',
    description: 'Begged to watch it. Passed out four minutes in.',
    sticker: 'movie',
    unit: 'coffee',
  },
  burrito: {
    title: 'The Blanket Burrito',
    description: 'Rolled up in 95% of the duvet.',
    sticker: 'burrito',
    unit: 'coffee',
  },
  pan: {
    title: 'The Eternal Soak',
    description: 'The pan has been “soaking” since Tuesday.',
    sticker: 'pan',
    unit: 'dish',
  },
  clock: {
    title: 'Snooze Roulette',
    description: 'Hit snooze six times. On your side of the bed.',
    sticker: 'clock',
    unit: 'coffee',
  },
  crumbs: {
    title: 'Midnight Crumbs',
    description: 'Ate cookies in bed at 2 AM and left the evidence.',
    sticker: 'crumbs',
    unit: 'coffee',
  },
  roll: {
    title: 'The Cardboard Tube',
    description: 'Left the empty roll on the holder and walked away.',
    sticker: 'roll',
    unit: 'dish',
  },
  dj: {
    title: 'Car DJ Crimes',
    description: 'Played DJ in the car. Badly. With commentary.',
    sticker: 'tape',
    unit: 'foot',
  },
} as const satisfies Record<string, CrimeInfo>;

export type CrimeKey = keyof typeof CRIMES;
export const CRIME_KEYS = Object.keys(CRIMES) as CrimeKey[];

/** spec §6: a pair's own crime is filed and stored under this key. */
export const customKey = (id: string): string => `custom:${id}`;
export const isCustomKey = (key: string): boolean => key.startsWith('custom:');

/** spec §6: the catalog plus a pair's own crimes, by the key charges store. */
export type CrimeBook = Readonly<Record<string, CrimeInfo>>;
export function bookFor(custom: readonly ({ id: string } & CrimeInfo)[]): CrimeBook {
  return { ...CRIMES, ...Object.fromEntries(custom.map(({ id, ...c }) => [customKey(id), c])) };
}

const REMOVED: CrimeInfo = { title: 'A removed crime', description: '', sticker: 'crumbs', unit: 'coffee' };
/** A crime by key; a key the book does not know reads as a removed crime rather than crashing. */
export const crimeInfo = (book: CrimeBook, key: string): CrimeInfo => book[key] ?? REMOVED;

/** A verdict's top crime: custom crimes carry their title and sticker, frozen at sealing (spec §10 step 6). */
export type TopCrime = { crime: string; count: number; title?: string; sticker?: StickerKey };
export function topCrimeInfo(t: TopCrime): { title: string; sticker: StickerKey } {
  const c = t.title && t.sticker ? t : crimeInfo(CRIMES, t.crime);
  return { title: c.title!, sticker: c.sticker! };
}

/** User text: trimmed, inner whitespace collapsed. */
const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(min).max(max));

export const UNIT_KEYS = Object.keys(UNITS) as UnitKey[];
export const stickerSchema = z.enum(STICKERS as [StickerKey, ...StickerKey[]]);

/** spec §6: `POST /crimes`. `chore`: a daily chore for the creator ('me') or the partner ('them'). */
export const customCrimeBody = z.object({
  title: text(1, 40),
  description: text(0, 80),
  unit: z.enum(UNIT_KEYS as [UnitKey, ...UnitKey[]]),
  sticker: stickerSchema,
  chore: z.enum(['me', 'them']).nullable(),
});
/** spec §6: how many crimes of its own a pair can have at once. */
export const CUSTOM_CRIMES_MAX = 30;

/** spec §7. */
export const SENTENCES = {
  coffee7: {
    title: '7 days of morning coffee duty',
    detail: 'Made before the winner wakes. Delivered without commentary.',
    icon: 'cups',
  },
  netflix: {
    title: 'Uncontested Netflix pick',
    detail: 'One evening. No sighing, no phone.',
    icon: 'remote',
  },
  trash7: {
    title: '7 days of morning trash duty',
    detail: 'Before coffee. In whatever weather the court provides.',
    icon: 'bag',
  },
  footrub: {
    title: 'A 15-minute foot rub',
    detail: 'Timed. The clock restarts if you check your phone.',
    icon: 'foot',
  },
  breakfast: {
    title: 'Breakfast in bed',
    detail: 'Hot, plated and delivered. Crumbs are your problem.',
    icon: 'tray',
  },
  fitted: { title: 'Fitted sheet duty. Alone.', detail: 'No tutorials. No crying.', icon: 'blanket' },
} as const satisfies Record<string, { title: string; detail: string; icon: IconName }>;

export type SentenceKey = keyof typeof SENTENCES;
export const SENTENCE_KEYS = Object.keys(SENTENCES) as SentenceKey[];

/** spec §8. `guilty`, `pending` and `upheld` count toward the score. */
export type ChargeStatus = 'pending' | 'guilty' | 'appealed' | 'upheld' | 'dropped';
