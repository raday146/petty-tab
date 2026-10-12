import { describe, expect, it } from 'vitest';
import {
  INVITE_TTL_MS,
  inviteStatus,
  nameSchema,
  speciesSchema,
  timezoneSchema,
  updateMemberBody,
} from './identity.ts';

describe('nameSchema (spec §4.1)', () => {
  it.each([
    ['  Maya  ', 'Maya'],
    ['Mary   Jane', 'Mary Jane'],
    ['a\t \nb', 'a b'],
    ['מאיה', 'מאיה'],
    ['🐱'.repeat(12), '🐱'.repeat(12)],
    ['שָׁלוֹם', 'שָׁלוֹם'],
  ])('accepts %j as %j', (input, out) => {
    expect(nameSchema.parse(input)).toBe(out);
  });

  it.each(['', '   ', 'abcdefghijklm', '🐱'.repeat(13)])('refuses %j', (input) => {
    expect(nameSchema.safeParse(input).success).toBe(false);
  });

  it('counts characters, not UTF-16 units: 12 letters with niqqud fit', () => {
    expect(nameSchema.safeParse('שָׁ'.repeat(12)).success).toBe(true);
  });
});

describe('speciesSchema', () => {
  it('accepts the nine keys and nothing else', () => {
    expect(speciesSchema.parse('capy')).toBe('capy');
    expect(speciesSchema.safeParse('dog').success).toBe(false);
  });
});

describe('timezoneSchema', () => {
  it.each(['Asia/Jerusalem', 'America/New_York', 'UTC'])('accepts %s', (tz) => {
    expect(timezoneSchema.parse(tz)).toBe(tz);
  });
  it.each(['Mars/Olympus', '', 'not a zone'])('refuses %j', (tz) => {
    expect(timezoneSchema.safeParse(tz).success).toBe(false);
  });
});

describe('updateMemberBody', () => {
  it('needs a name or a species', () => {
    expect(updateMemberBody.safeParse({}).success).toBe(false);
    expect(updateMemberBody.parse({ name: ' Al ' })).toEqual({ name: 'Al' });
  });
});

describe('inviteStatus (spec §4.2)', () => {
  const now = new Date('2026-10-12T10:00:00Z');
  const fresh = { expiresAt: new Date(now.getTime() + INVITE_TTL_MS), usedAt: null, revokedAt: null };

  it('is valid until it expires, single use and not revoked', () => {
    expect(inviteStatus(fresh, now)).toBe('valid');
  });
  it('expires at expires_at exactly', () => {
    expect(inviteStatus(fresh, new Date(fresh.expiresAt.getTime() - 1))).toBe('valid');
    expect(inviteStatus(fresh, fresh.expiresAt)).toBe('expired');
  });
  it('is used once accepted, and revoked by a new link', () => {
    expect(inviteStatus({ ...fresh, usedAt: now }, now)).toBe('used');
    expect(inviteStatus({ ...fresh, revokedAt: now }, now)).toBe('revoked');
  });
  it('lasts 7 days', () => {
    expect(INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
