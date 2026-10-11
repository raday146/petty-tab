/** @petty-tab/art: every function returns an SVG markup string. */

export type Species = 'cat' | 'bear' | 'lion' | 'rabbit' | 'turtle' | 'sheep' | 'raccoon' | 'capy' | 'pup';
/** plain: neutral · sig: the species' signature expression · smug: winner · sad: guilty · strain: losing / carrying · wink · dizzy: buried */
export type Face = 'plain' | 'sig' | 'smug' | 'sad' | 'strain' | 'wink' | 'dizzy';
export type Pose = 'sit' | 'lounge' | 'stand';
export type Arms = 'rest' | 'crossed' | 'up' | 'hips' | 'bell' | 'none';
/** 1 looks right, -1 looks left (pupils, tears and tails follow it) */
export type Dir = 1 | -1;
export type StickerKey = 'sip' | 'trash' | 'dish' | 'movie' | 'burrito' | 'pan' | 'clock' | 'roll' | 'tape' | 'crumbs';
export type IconName = 'roll' | 'blanket' | 'tape' | 'mug' | 'dish' | 'foot' | 'gavel' | 'plus' | 'link' | 'remote' | 'bag' | 'tray' | 'cups';

export interface SpeciesInfo {
  /** "The Judgy Cat" */
  name: string;
  /** "The Cat" */
  tag: string;
  /** one-line bio for the picker */
  trait: string;
  /** tint behind the picker portrait */
  bg: string;
  /** viewBox that frames the head for a round avatar */
  vb: string;
}
export interface Fur { f: string; l: string; d: string; e: string }

export interface StoryLayers {
  floor: string; sofa: string; winner: string; winnerWink: string; sparkles: string;
  loserIn: string; loserBuried: string; basket: string; laundry: string;
  /** three crime tokens, in drop order */
  tokens: string[];
  plates: string; orbit: string;
  geometry: {
    unit: number; viewBox: [number, number]; stageTop: number; sofaFloor: number; floor: number;
    winnerX: number; winnerY: number; winnerScale: number; loserX: number; loserHeadTop: number;
    tokenPositions: [number, number, number][];
  };
}

export interface Art {
  avatar(sp: Species, face?: Face, label?: string): string;
  headSVG(sp: Species, face?: Face, dir?: Dir, label?: string): string;
  stickerHead(sp: Species, face?: Face, dir?: Dir): string;
  portrait(sp: Species, label?: string): string;
  figureSVG(sp: Species, face?: Face, dir?: Dir, pose?: Pose, opts?: { arms?: Arms; tilt?: number; hcls?: string }): string;
  lumpSVG(): string;
  cupCrownSVG(): string;
  sticker(key: StickerKey): string;
  icon(name: IconName, extraClass?: string): string;
  scenes: {
    /** intro household portrait, viewBox 0 44 390 292 */
    hero(): string;
    /** verdict card illustration, viewBox 0 -30 350 196 */
    verdict(o: { winner: Species; loser: Species; tokens: StickerKey[]; label?: string }): string;
    /** the reel's animated layers, each viewBox 0 0 270 228 */
    story(o: { winner: Species; loser: Species; tokens: StickerKey[] }): StoryLayers;
    seal(): string;
  };
  /** inner-markup builders (no <svg> wrapper) for custom compositions; origin is the head centre */
  raw: Record<string, (...args: any[]) => string>;
  SPECIES: Record<Species, SpeciesInfo>;
  ORDER: Species[];
  FUR: Record<Species, Fur>;
  /** y of the top of each head (crowns and baskets sit here) */
  HEADTOP: Record<Species, number>;
  COLORS: Record<string, string>;
  STICKERS: StickerKey[];
  ICONS: IconName[];
  FACES: Face[];
  POSES: Pose[];
  ARMS: Arms[];
}

/** One renderer per rendered component: clipPath ids are `${idPrefix}-N`, deterministic for SSR. */
export function createArt(options?: { idPrefix?: string }): Art;

export const SPECIES: Art['SPECIES'];
export const ORDER: Art['ORDER'];
export const FUR: Art['FUR'];
export const HEADTOP: Art['HEADTOP'];
export const COLORS: Art['COLORS'];
export const STICKERS: Art['STICKERS'];
export const ICONS: Art['ICONS'];
export const FACES: Art['FACES'];
export const POSES: Art['POSES'];
export const ARMS: Art['ARMS'];
/** stroke CSS for standalone files */
export const STYLE: string;
/** adds xmlns and the stroke styles so the string works as a standalone .svg file */
export function standalone(svg: string): string;
