import type { ServerResponse } from 'node:http';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import {
  acceptInviteBody,
  createPairBody,
  updateMemberBody,
  type InvitePreview,
  type Me,
} from '@petty-tab/shared';
import { parse } from './errors.js';
import { PairingService, type InviteLink } from './pairing.service.js';
import { clearCookie, UserId } from './session.middleware.js';

/** spec §14: identity and pairing endpoints. Bodies are validated with the shared zod schemas. */
@Controller()
export class PairingController {
  constructor(private readonly pairing: PairingService) {}

  @Get('me')
  me(@UserId() userId: string): Promise<Me> {
    return this.pairing.me(userId);
  }

  @Delete('me')
  @HttpCode(204)
  async deleteEverything(
    @UserId() userId: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<void> {
    await this.pairing.deleteEverything(userId);
    clearCookie(res);
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

  @Patch('members/me')
  updateMember(@UserId() userId: string, @Body() body: unknown): Promise<Me> {
    return this.pairing.updateMember(userId, parse(updateMemberBody, body));
  }

  @Delete('pairs/current')
  @HttpCode(204)
  leave(@UserId() userId: string): Promise<void> {
    return this.pairing.leave(userId);
  }
}
