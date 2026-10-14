import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { ChargesService } from './charges.service.js';
import { parse } from './errors.js';
import { PairingService } from './pairing.service.js';
import { UserId } from './session.middleware.js';
import { VerdictsService } from './verdicts.service.js';

/**
 * End-to-end tests only: mounted when E2E_HOOKS=1 (app.module.ts), never in production. Seals the caller's
 * current week as if its Sunday 20:00 had come, without moving anyone else's clock (spec files run in
 * parallel). The pair moves on to its next cycle, which starts at that Sunday, ahead of the real clock.
 */
@Controller('dev')
export class DevController {
  constructor(
    private readonly pairing: PairingService,
    private readonly verdicts: VerdictsService,
    private readonly charges: ChargesService,
  ) {}

  /** Runs the caller's pair's midnight chore sweep as if it were `at`. */
  @Post('chores/sweep')
  @HttpCode(204)
  async sweep(@UserId() userId: string, @Body() body: unknown): Promise<void> {
    const { at } = parse(z.object({ at: z.iso.datetime() }), body);
    const { pairId } = await this.pairing.inPair(userId);
    await this.charges.neglectedChores(new Date(at), { pairId });
  }

  @Post('seal')
  @HttpCode(204)
  async seal(@UserId() userId: string): Promise<void> {
    const { pairId, pair } = await this.pairing.inPair(userId);
    await this.verdicts.sealDue(pair.cycleEnd!, { pairId });
  }
}
