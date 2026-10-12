import { Controller, Get } from '@nestjs/common';
import type { Me } from '@petty-tab/shared';
import { PairingService } from './pairing.service.js';
import { UserId } from './session.middleware.js';

/** spec §14: identity and pairing endpoints. Bodies are validated with the shared zod schemas. */
@Controller()
export class PairingController {
  constructor(private readonly pairing: PairingService) {}

  @Get('me')
  me(@UserId() userId: string): Promise<Me> {
    return this.pairing.me(userId);
  }
}
