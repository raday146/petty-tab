import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ChargesController } from './charges.controller.js';
import { DeadlineController } from './deadline.controller.js';
import { DeadlineService } from './deadline.service.js';
import { ChargesService } from './charges.service.js';
import { Clock } from './clock.js';
import { EventsController } from './events.controller.js';
import { FilesController } from './files.controller.js';
import { Events } from './events.js';
import { GuardMiddleware } from './guard.middleware.js';
import { HealthController } from './health.controller.js';
import { Jobs } from './jobs.js';
import { PairingController } from './pairing.controller.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';
import { SessionMiddleware } from './session.middleware.js';
import { DevController } from './dev.controller.js';
import { VerdictsController } from './verdicts.controller.js';
import { VerdictsService } from './verdicts.service.js';

// The time-travel hook for end-to-end tests; never mounted unless E2E_HOOKS=1.
const dev = process.env.E2E_HOOKS === '1' ? [DevController] : [];

@Module({
  controllers: [
    HealthController,
    PairingController,
    ChargesController,
    DeadlineController,
    VerdictsController,
    EventsController,
    FilesController,
    PushController,
    ...dev,
  ],
  providers: [
    PrismaService,
    Clock,
    Jobs,
    Events,
    PushService,
    PairingService,
    ChargesService,
    VerdictsService,
    DeadlineService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Every route but /health is guarded (CSRF, rate limits) and has a session (spec §3), in that order.
    consumer
      .apply(GuardMiddleware, SessionMiddleware)
      .forRoutes(
        PairingController,
        ChargesController,
        DeadlineController,
        VerdictsController,
        EventsController,
        PushController,
        ...dev,
      );
  }
}
