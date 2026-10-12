import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { PgBoss } from 'pg-boss';

/** The queues; pg-boss keeps them in its own `pgboss` schema on the same Postgres. */
export const QUEUES = { chargePush: 'charge-push', autoGuilty: 'auto-guilty', seal: 'seal' } as const;

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
