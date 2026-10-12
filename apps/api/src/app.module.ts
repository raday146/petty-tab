import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { Clock } from './clock.js';
import { HealthController } from './health.controller.js';
import { PairingController } from './pairing.controller.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { SessionMiddleware } from './session.middleware.js';

@Module({
  controllers: [HealthController, PairingController],
  providers: [PrismaService, Clock, PairingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Every route but /health has a session (spec §3).
    consumer.apply(SessionMiddleware).forRoutes(PairingController);
  }
}
