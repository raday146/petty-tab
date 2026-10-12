import type { ApiErrorBody } from '@petty-tab/shared';

/** A refused API call, carrying spec §14's stable error code. */
export class ApiFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** Same-origin call to `/api/*` (Next rewrites it to Nest), with the session cookie. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const json = init?.body !== undefined;
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? (json ? 'POST' : 'GET'),
    headers: json ? { 'content-type': 'application/json' } : undefined,
    body: json ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiFailure(body?.error.code ?? `http_${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
