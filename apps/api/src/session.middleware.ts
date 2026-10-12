import type { IncomingMessage, ServerResponse } from 'node:http';
import { createParamDecorator, Injectable, type ExecutionContext, type NestMiddleware } from '@nestjs/common';
import { Clock } from './clock.js';
import { newToken, sha256 } from './crypto.js';
import { PrismaService } from './prisma.service.js';

export const COOKIE = 'pt_session';
const YEAR = 365 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export type SessionRequest = IncomingMessage & { userId?: string };

export function readCookie(header: string | undefined, name: string): string | undefined {
  const pair = header?.split(';').find((c) => c.trim().startsWith(`${name}=`));
  return pair?.split('=')[1]?.trim();
}

/**
 * spec §3: an anonymous user per device. No cookie (or an unknown or expired one) creates a user and a
 * session; the cookie holds a random id, the database only its hash.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async use(req: SessionRequest, res: ServerResponse, next: () => void): Promise<void> {
    const now = this.clock.now();
    const token = readCookie(req.headers.cookie, COOKIE);
    const session = token
      ? await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) } })
      : null;

    if (token && session && session.expiresAt > now) {
      req.userId = session.userId;
      // ponytail: refreshed at most once a day, not on every request, to keep reads write-free.
      if (session.expiresAt.getTime() - now.getTime() < YEAR - DAY) {
        const expiresAt = new Date(now.getTime() + YEAR);
        await this.prisma.session.update({
          where: { id: session.id },
          data: { expiresAt, user: { update: { lastSeenAt: now } } },
        });
        setCookie(res, token, expiresAt);
      }
    } else {
      const fresh = newToken();
      const expiresAt = new Date(now.getTime() + YEAR);
      const user = await this.prisma.user.create({
        data: { sessions: { create: { tokenHash: sha256(fresh), expiresAt } } },
      });
      req.userId = user.id;
      setCookie(res, fresh, expiresAt);
    }
    next();
  }
}

function setCookie(res: ServerResponse, token: string, expires: Date): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Lax`,
  );
}

/** The session's user id, set by SessionMiddleware. */
export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<SessionRequest>().userId!,
);
