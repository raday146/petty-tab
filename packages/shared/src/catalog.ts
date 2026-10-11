import type { IconName, StickerKey } from '@petty-tab/art';

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

interface Crime {
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
} as const satisfies Record<string, Crime>;

export type CrimeKey = keyof typeof CRIMES;
export const CRIME_KEYS = Object.keys(CRIMES) as CrimeKey[];

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
