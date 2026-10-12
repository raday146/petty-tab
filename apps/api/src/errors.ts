import { HttpException } from '@nestjs/common';
import type { z } from 'zod';
import type { ApiErrorBody } from '@petty-tab/shared';

/** Serialises as `{ error: { code, message } }` (spec §14). */
export class ApiError extends HttpException {
  constructor(status: number, code: string, message: string) {
    super({ error: { code, message } } satisfies ApiErrorBody, status);
  }
}

/** Validate a request body against a shared zod schema; 400 `invalid_request` otherwise. */
export function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, 'invalid_request', result.error.issues[0]?.message ?? 'Invalid request.');
  }
  return result.data;
}
