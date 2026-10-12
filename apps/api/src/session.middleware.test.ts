import type { ServerResponse } from 'node:http';
import { afterAll, describe, expect, it } from 'vitest';
import type { Clock } from './clock.js';
import { sha256 } from './crypto.js';
import { PrismaService } from './prisma.service.js';
import { COOKIE, SessionMiddleware, type SessionRequest } from './session.middleware.js';

const prisma = new PrismaService();
afterAll(() => prisma.$disconnect());

let now = new Date('2026-10-12T10:00:00Z');
const mw = new SessionMiddleware(prisma, { now: () => now } as Clock);

async function visit(cookie?: string): Promise<{ userId: string; setCookie?: string }> {
  const req = { headers: { cookie } } as SessionRequest;
  let setCookie: string | undefined;
  const res = { setHeader: (_: string, v: string) => (setCookie = v) } as unknown as ServerResponse;
  await mw.use(req, res, () => undefined);
  return { userId: req.userId!, setCookie };
}
const token = (setCookie?: string): string => setCookie!.split(';')[0]!.split('=')[1]!;

describe('SessionMiddleware (spec §3)', () => {
  it('creates a user and sets a 1-year httpOnly, Secure, SameSite=Lax cookie on first visit', async () => {
    const first = await visit();
    expect(first.userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.setCookie).toContain(`${COOKIE}=`);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'])
      expect(first.setCookie).toContain(flag);
    expect(first.setCookie).toContain(`Expires=${new Date(now.getTime() + 365 * 864e5).toUTCString()}`);
  });

  it('resolves the same user from the cookie and stores only the hash', async () => {
    const first = await visit();
    const t = token(first.setCookie);
    const again = await visit(`other=1; ${COOKIE}=${t}`);
    expect(again.userId).toBe(first.userId);
    expect(again.setCookie).toBeUndefined();
    expect(await prisma.session.count({ where: { tokenHash: t } })).toBe(0);
    expect(await prisma.session.count({ where: { tokenHash: sha256(t) } })).toBe(1);
  });

  it('refreshes the expiry once a day of use has passed', async () => {
    const first = await visit();
    now = new Date(now.getTime() + 2 * 864e5);
    const later = await visit(`${COOKIE}=${token(first.setCookie)}`);
    expect(later.userId).toBe(first.userId);
    expect(later.setCookie).toContain(new Date(now.getTime() + 365 * 864e5).toUTCString());
  });

  it('gives an unknown cookie a new user', async () => {
    const stranger = await visit(`${COOKIE}=not-a-session`);
    expect(stranger.setCookie).toBeDefined();
  });

  it('gives an expired session a new user', async () => {
    const first = await visit();
    now = new Date(now.getTime() + 366 * 864e5);
    const back = await visit(`${COOKIE}=${token(first.setCookie)}`);
    expect(back.userId).not.toBe(first.userId);
  });
});
