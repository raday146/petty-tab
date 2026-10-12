import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { acceptInviteBody, createPairBody, type InvitePreview, type Me } from '@petty-tab/shared';
import { parse } from './errors.js';
import { PairingService, type InviteLink } from './pairing.service.js';
import { UserId } from './session.middleware.js';

/** spec §14: identity and pairing endpoints. Bodies are validated with the shared zod schemas. */
@Controller()
export class PairingController {
  constructor(private readonly pairing: PairingService) {}

  @Get('me')
  me(@UserId() userId: string): Promise<Me> {
    return this.pairing.me(userId);
  }

  @Post('pairs')
  createPair(@UserId() userId: string, @Body() body: unknown): Promise<InviteLink> {
    return this.pairing.createPair(userId, parse(createPairBody, body));
  }

  @Get('pairs/invite')
  currentInvite(@UserId() userId: string): Promise<InviteLink> {
    return this.pairing.currentInvite(userId);
  }

  @Post('pairs/invite')
  newInvite(@UserId() userId: string): Promise<InviteLink> {
    return this.pairing.newInvite(userId);
  }

  @Get('invites/:token')
  previewInvite(@UserId() userId: string, @Param('token') token: string): Promise<InvitePreview> {
    return this.pairing.previewInvite(userId, token);
  }

  @Post('invites/:token/accept')
  @HttpCode(204)
  acceptInvite(
    @UserId() userId: string,
    @Param('token') token: string,
    @Body() body: unknown,
  ): Promise<void> {
    return this.pairing.acceptInvite(userId, token, parse(acceptInviteBody, body));
  }
}
