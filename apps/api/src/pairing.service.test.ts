import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { INVITE_TTL_MS, type Species } from '@petty-tab/shared';
import type { Clock } from './clock.js';
import { sha256 } from './crypto.js';
import { Events } from './events.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import type { PushService } from './push.service.js';

// Real database; every test makes its own users, so no cleanup is needed.
const prisma = new PrismaService();
afterAll(() => prisma.$disconnect());

let now: Date;
// Pushes are covered in push.service.test.ts.
const push = { notify: async () => undefined } as unknown as PushService;
const service = new PairingService(prisma, { now: () => now } as Clock, new Events(), push);
beforeEach(() => {
  now = new Date('2026-10-12T10:00:00Z');
});

const newUser = async (): Promise<string> => (await prisma.user.create({ data: {} })).id;
const tokenOf = (link: string): string => link.replace('/j/', '');
const code = (p: Promise<unknown>): Promise<unknown> =>
  p.then(
    () => 'ok',
    (e: { getResponse?: () => { error: { code: string } } }) => e.getResponse?.().error.code ?? e,
  );

async function startTab(name = 'Maya', species: Species = 'cat') {
  const a = await newUser();
  const { link } = await service.createPair(a, { name, species, timezone: 'Asia/Jerusalem' });
  return { a, token: tokenOf(link) };
}

describe('start a tab (spec §4.1)', () => {
  it('makes A the first member of a waiting pair', async () => {
    const { a } = await startTab();
    expect(await service.me(a)).toEqual({
      member: { name: 'Maya', species: 'cat' },
      pair: { complete: false, partner: null },
    });
  });

  it('refuses a second tab while in one', async () => {
    const { a } = await startTab();
    expect(await code(service.createPair(a, { name: 'M', species: 'bear', timezone: 'UTC' }))).toBe(
      'already_in_pair',
    );
  });

  it('stores the token hashed and encrypted, never in the clear', async () => {
    const { token } = await startTab();
    const invite = await prisma.invite.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    expect(invite.tokenEnc).not.toContain(token);
  });
});

describe('invite link lifecycle (spec §4.2)', () => {
  it('re-displays the same link while waiting', async () => {
    const { a, token } = await startTab();
    expect(tokenOf((await service.currentInvite(a)).link)).toBe(token);
    expect(tokenOf((await service.currentInvite(a)).link)).toBe(token);
  });

  it('replaces an expired link the next time the waiting card loads', async () => {
    const { a, token } = await startTab();
    now = new Date(now.getTime() + INVITE_TTL_MS);
    const fresh = tokenOf((await service.currentInvite(a)).link);
    expect(fresh).not.toBe(token);
    expect(await code(service.previewInvite(await newUser(), token))).toBe('invite_invalid');
    expect(await code(service.previewInvite(await newUser(), fresh))).toBe('ok');
  });

  it('New link revokes the previous one', async () => {
    const { a, token } = await startTab();
    const fresh = tokenOf((await service.newInvite(a)).link);
    const b = await newUser();
    expect(await code(service.acceptInvite(b, token, { name: 'Alex', species: 'bear' }))).toBe(
      'invite_invalid',
    );
    expect(await code(service.acceptInvite(b, fresh, { name: 'Alex', species: 'bear' }))).toBe('ok');
  });

  it('is single use', async () => {
    const { token } = await startTab();
    expect(await code(service.acceptInvite(await newUser(), token, { name: 'Alex', species: 'bear' }))).toBe(
      'ok',
    );
    expect(await code(service.acceptInvite(await newUser(), token, { name: 'Sam', species: 'pup' }))).toBe(
      'invite_invalid',
    );
  });

  it('refuses unknown tokens', async () => {
    expect(await code(service.previewInvite(await newUser(), 'nope'))).toBe('invite_invalid');
  });

  it('has no waiting card once the pair is complete', async () => {
    const { a, token } = await startTab();
    await service.acceptInvite(await newUser(), token, { name: 'Alex', species: 'bear' });
    expect(await code(service.currentInvite(a))).toBe('not_allowed');
  });
});

describe('join (spec §4.3–4.4)', () => {
  it('shows who invited you, and whether it is your own link', async () => {
    const { a, token } = await startTab();
    expect(await service.previewInvite(await newUser(), token)).toEqual({
      inviter: { name: 'Maya', species: 'cat' },
      own: false,
    });
    expect((await service.previewInvite(a, token)).own).toBe(true);
  });

  it('completes the pair for both members', async () => {
    const { a, token } = await startTab();
    const b = await newUser();
    await service.acceptInvite(b, token, { name: 'Alex', species: 'bear' });
    expect((await service.me(a)).pair).toEqual({
      complete: true,
      partner: { name: 'Alex', species: 'bear' },
    });
    expect((await service.me(b)).pair).toEqual({ complete: true, partner: { name: 'Maya', species: 'cat' } });
  });

  it("refuses the inviter's animal and keeps the link usable", async () => {
    const { token } = await startTab();
    const b = await newUser();
    expect(await code(service.acceptInvite(b, token, { name: 'Alex', species: 'cat' }))).toBe(
      'species_taken',
    );
    expect(await code(service.acceptInvite(b, token, { name: 'Alex', species: 'bear' }))).toBe('ok');
  });

  it('refuses someone already in a pair and does not consume the link', async () => {
    const { token } = await startTab();
    const { a: other } = await startTab('Sam', 'pup');
    expect(await code(service.previewInvite(other, token))).toBe('ok');
    expect(await code(service.acceptInvite(other, token, { name: 'Sam', species: 'pup' }))).toBe(
      'already_in_pair',
    );
    const invite = await prisma.invite.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    expect(invite.usedAt).toBeNull();
  });
});

describe('rename, change animal, leave (spec §4.6–4.7)', () => {
  async function pairUp() {
    const { a, token } = await startTab();
    const b = await newUser();
    await service.acceptInvite(b, token, { name: 'Alex', species: 'bear' });
    return { a, b };
  }

  it('renames and changes animal, the partner sees it', async () => {
    const { a, b } = await pairUp();
    expect((await service.updateMember(b, { name: 'Lex', species: 'pup' })).member).toEqual({
      name: 'Lex',
      species: 'pup',
    });
    expect((await service.me(a)).pair?.partner).toEqual({ name: 'Lex', species: 'pup' });
  });

  it("refuses the partner's animal", async () => {
    const { b } = await pairUp();
    expect(await code(service.updateMember(b, { species: 'cat' }))).toBe('species_taken');
  });

  it('leaving ends the pair for both, and both can start again', async () => {
    const { a, b } = await pairUp();
    await service.leave(a);
    expect(await service.me(a)).toEqual({ member: null, pair: null });
    expect(await service.me(b)).toEqual({ member: null, pair: null });
    expect(await code(service.createPair(b, { name: 'Alex', species: 'cat', timezone: 'UTC' }))).toBe('ok');
  });

  it('leaving a waiting pair kills its link', async () => {
    const { a, token } = await startTab();
    await service.leave(a);
    expect(await code(service.previewInvite(await newUser(), token))).toBe('invite_invalid');
  });

  it('needs a pair', async () => {
    expect(await code(service.leave(await newUser()))).toBe('not_in_pair');
  });
});
