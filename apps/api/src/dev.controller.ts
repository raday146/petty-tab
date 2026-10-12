import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { UserId } from './session.middleware.js';
import { VerdictsService } from './verdicts.service.js';

/**
 * End-to-end tests only: mounted when E2E_HOOKS=1 (app.module.ts), never in production. Moves the caller's
 * pair `days` into the past, then runs the sealer, so a test can reach Sunday 20:00 without waiting.
 */
@Controller('dev')
export class DevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pairing: PairingService,
    private readonly verdicts: VerdictsService,
  ) {}

  @Post('travel')
  @HttpCode(204)
  async travel(@UserId() userId: string, @Body() body: { days: number }): Promise<void> {
    const { pairId } = await this.pairing.inPair(userId);
    const shift = `${Number(body.days)} days`;
    await this.prisma.$transaction([
      this.prisma
        .$executeRaw`UPDATE members SET joined_at = joined_at - ${shift}::interval WHERE pair_id = ${pairId}::uuid`,
      this.prisma.$executeRaw`UPDATE charges SET created_at = created_at - ${shift}::interval,
        week_start = week_start - ${shift}::interval WHERE pair_id = ${pairId}::uuid`,
    ]);
    await this.verdicts.sealDue();
  }
}
