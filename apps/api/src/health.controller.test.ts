import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';
import type { PrismaService } from './prisma.service.js';

const withDb = (query: () => Promise<unknown>): HealthController =>
  new HealthController({ $queryRaw: query } as unknown as PrismaService);

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    await expect(withDb(async () => [{ '?column?': 1 }]).check()).resolves.toEqual({
      status: 'ok',
      db: 'ok',
    });
  });

  it('returns 503 when the database is down', async () => {
    await expect(
      withDb(async () => {
        throw new Error('connection refused');
      }).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
