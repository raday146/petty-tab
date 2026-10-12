import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { RENDER_QUEUES } from '@petty-tab/shared';

/** The queues; pg-boss keeps them in its own `pgboss` schema on the same Postgres. */
export const QUEUES = {
  chargePush: 'charge-push',
  autoGuilty: 'auto-guilty',
  seal: 'seal',
  // spec §12: one push to a member's devices, and the Wednesday sentence reminder sweep.
  push: 'push',
  reminder: 'reminder',
  // spec §4.7: deletes pairs 30 days after they ended.
  purge: 'purge',
  // spec §11: the API queues renders for apps/renderer, which reports back on `rendered`.
  ...RENDER_QUEUES,
} as const;

/** The one pg-boss instance. Services send jobs through `boss` and register their workers on it. */
@Injectable()
export class Jobs implements OnModuleDestroy {
  readonly boss = new PgBoss(process.env.DATABASE_URL!);
  private started?: Promise<void>;

  constructor() {
    const log = new Logger('Jobs');
    this.boss.on('error', (e) => log.error(e));
  }

  /** Idempotent: starts the instance and creates the queues the first time. */
  start(): Promise<void> {
    this.started ??= (async () => {
      await this.boss.start();
      for (const name of Object.values(QUEUES)) await this.boss.createQueue(name);
    })();
    return this.started;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.started) await this.boss.stop();
  }
}
