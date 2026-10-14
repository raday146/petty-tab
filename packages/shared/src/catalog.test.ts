import { describe, expect, it } from 'vitest';
import { bookFor, crimeInfo, customCrimeBody, customKey, topCrimeInfo } from './catalog.ts';

const tp = {
  id: '019a0000-0000-7000-8000-000000000001',
  title: 'Toilet paper roulette',
  description: 'Left one square on the roll.',
  sticker: 'roll',
  unit: 'dish',
} as const;

describe('the crime book (spec §6: the catalog plus the pair’s own crimes)', () => {
  const book = bookFor([tp]);
  it('finds catalog crimes by key and custom crimes by custom:<id>', () => {
    expect(crimeInfo(book, 'sip').title).toBe('The Phantom Sip');
    expect(crimeInfo(book, customKey(tp.id))).toMatchObject({
      title: tp.title,
      sticker: 'roll',
      unit: 'dish',
    });
  });
  it('reads an unknown key as a removed crime instead of crashing', () => {
    expect(crimeInfo(book, 'custom:gone')).toMatchObject({ title: 'A removed crime', unit: 'coffee' });
  });
});

describe('topCrimeInfo', () => {
  it('reads a snapshot’s stored title and sticker, and fills old catalog-only entries from the catalog', () => {
    expect(topCrimeInfo({ crime: 'dj', count: 1 })).toEqual({ title: 'Car DJ Crimes', sticker: 'tape' });
    expect(topCrimeInfo({ crime: customKey(tp.id), count: 2, title: tp.title, sticker: 'roll' })).toEqual({
      title: tp.title,
      sticker: 'roll',
    });
  });
});

describe('customCrimeBody', () => {
  const ok = {
    title: '  Cup in   the sink ',
    description: 'Again.',
    unit: 'dish',
    sticker: 'dish',
    chore: null,
  };
  it('trims and accepts a crime, with or without a chore owner', () => {
    expect(customCrimeBody.parse(ok).title).toBe('Cup in the sink');
    expect(customCrimeBody.safeParse({ ...ok, chore: 'them' }).success).toBe(true);
  });
  it('refuses empty or long titles, unknown units and stickers', () => {
    for (const bad of [
      { ...ok, title: ' ' },
      { ...ok, title: 'x'.repeat(41) },
      { ...ok, description: 'x'.repeat(81) },
      { ...ok, unit: 'beer' },
      { ...ok, sticker: 'cat' },
      { ...ok, chore: 'both' },
    ]) {
      expect(customCrimeBody.safeParse(bad).success).toBe(false);
    }
  });
});
