import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import type { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { GuardMiddleware, NEW_SESSIONS_PER_MINUTE, WRITES_PER_MINUTE } from './guard.middleware.js';
import { COOKIE } from './session.middleware.js';

let now = new Date('2026-10-12T10:00:00Z');
const guard = new GuardMiddleware({ now: () => now } as Clock);

/** The error code the guard answers with, or 'ok' when it lets the request through. */
function code(method: string, headers: IncomingMessage['headers']): string {
  try {
    let passed = false;
    guard.use({ method, headers } as IncomingMessage, {} as ServerResponse, () => (passed = true));
    return passed ? 'ok' : 'stuck';
  } catch (e) {
    return ((e as ApiError).getResponse() as { error: { code: string } }).error.code;
  }
}
const cookie = (id: string): string => `${COOKIE}=${id}`;

describe('GuardMiddleware', () => {
  it('refuses a write from another site and lets same-origin writes and any read through', () => {
    const c = cookie('csrf');
    expect(code('POST', { cookie: c, 'sec-fetch-site': 'cross-site' })).toBe('not_allowed');
    expect(code('DELETE', { cookie: c, 'sec-fetch-site': 'same-site' })).toBe('not_allowed');
    expect(code('POST', { cookie: c, 'sec-fetch-site': 'same-origin' })).toBe('ok');
    expect(code('POST', { cookie: c })).toBe('ok');
    expect(code('GET', { cookie: c, 'sec-fetch-site': 'cross-site' })).toBe('ok');
  });

  it('limits writes per session per minute, not reads, and opens again after the minute', () => {
    const c = cookie('busy');
    for (let i = 0; i < WRITES_PER_MINUTE; i++) expect(code('POST', { cookie: c })).toBe('ok');
    expect(code('PATCH', { cookie: c })).toBe('rate_limited');
    expect(code('GET', { cookie: c })).toBe('ok');
    expect(code('POST', { cookie: cookie('calm') })).toBe('ok');
    now = new Date(now.getTime() + 60_000);
    expect(code('POST', { cookie: c })).toBe('ok');
  });

  it('limits new sessions per client IP, never loopback or an unknown IP', () => {
    const from = (ip: string) => ({ 'x-forwarded-for': `${ip}, 10.0.0.2` });
    for (let i = 0; i < NEW_SESSIONS_PER_MINUTE; i++) expect(code('GET', from('203.0.113.9'))).toBe('ok');
    expect(code('GET', from('203.0.113.9'))).toBe('rate_limited');
    expect(code('GET', from('198.51.100.4'))).toBe('ok');
    for (let i = 0; i <= NEW_SESSIONS_PER_MINUTE; i++) {
      expect(code('GET', from('127.0.0.1'))).toBe('ok');
      expect(code('GET', {})).toBe('ok');
    }
  });
});
