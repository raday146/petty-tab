import { Controller, HttpCode, Post } from '@nestjs/common';
import { currentWeek } from '@petty-tab/shared';
import { Clock } from './clock.js';
import { PairingService } from './pairing.service.js';
import { UserId } from './session.middleware.js';
import { VerdictsService } from './verdicts.service.js';

/**
 * End-to-end tests only: mounted when E2E_HOOKS=1 (app.module.ts), never in production. Seals the caller's
 * current week as if its Sunday 20:00 had come, without moving anyone else's clock (spec files run in
 * parallel). The real clock still reads mid-week, so the tab keeps showing that week afterwards.
 */
@Controller('dev')
export class DevController {
  constructor(
    private readonly clock: Clock,
    private readonly pairing: PairingService,
    private readonly verdicts: VerdictsService,
  ) {}

  @Post('seal')
  @HttpCode(204)
  async seal(@UserId() userId: string): Promise<void> {
    const { pairId, pair } = await this.pairing.inPair(userId);
    const { end } = currentWeek(pair.members[1]!.joinedAt, pair.timezone, this.clock.now());
    await this.verdicts.sealDue(end, { pairId });
  }
}
