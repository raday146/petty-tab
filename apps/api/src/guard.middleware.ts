import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { COOKIE, readCookie } from './session.middleware.js';

const MINUTE = 60_000;
/** Writes per session per minute. Above any human pace; the charge limit of spec §7 still applies on top. */
export const WRITES_PER_MINUTE = 60;
/** Requests without a session per client IP per minute: each one creates a user (spec §3). */
export const NEW_SESSIONS_PER_MINUTE = 30;

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/;

const tooMany = (): ApiError => new ApiError(429, 'rate_limited', 'Slow down a little and try again.');

/**
 * Runs before SessionMiddleware on every route but /health.
 * - CSRF: a write from another site is refused. The cookie is SameSite=Lax already; `Sec-Fetch-Site` (sent by
 *   every current browser) also covers same-site subdomains.
 * - Rate limits: writes per session cookie, and cookieless requests per client IP (the first hop of
 *   X-Forwarded-For, which Caddy sets). No client IP or a loopback one (dev, e2e) is not limited by IP.
 * ponytail: in-memory fixed windows, right for one API process on one server; a table if it ever scales out.
 */
@Injectable()
export class GuardMiddleware implements NestMiddleware {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(private readonly clock: Clock) {}

  use(req: IncomingMessage, _res: ServerResponse, next: () => void): void {
    const write = WRITE.has(req.method ?? '');
    const site = req.headers['sec-fetch-site'];
    if (write && (site === 'cross-site' || site === 'same-site'))
      throw new ApiError(403, 'not_allowed', 'That request came from another site.');

    const session = readCookie(req.headers.cookie, COOKIE);
    if (session) {
      if (write && !this.take(`s:${session}`, WRITES_PER_MINUTE)) throw tooMany();
    } else {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
      if (ip && !LOOPBACK.test(ip) && !this.take(`ip:${ip}`, NEW_SESSIONS_PER_MINUTE)) throw tooMany();
    }
    next();
  }

  /** Counts one request against `key`; false once the window's limit is used up. */
  private take(key: string, limit: number): boolean {
    const now = this.clock.now().getTime();
    if (this.windows.size > 10_000)
      for (const [k, w] of this.windows) if (now - w.start >= MINUTE) this.windows.delete(k);
    const w = this.windows.get(key);
    if (!w || now - w.start >= MINUTE) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    return ++w.count <= limit;
  }
}
