import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { sentenceBody, type VerdictView } from '@petty-tab/shared';
import { parse } from './errors.js';
import { UserId } from './session.middleware.js';
import { VerdictsService } from './verdicts.service.js';

/** spec §14: the verdicts. `:id` is a verdict id or `latest`. */
@Controller('verdicts/:id')
export class VerdictsController {
  constructor(private readonly verdicts: VerdictsService) {}

  @Get()
  view(@UserId() userId: string, @Param('id') id: string): Promise<VerdictView> {
    return this.verdicts.view(userId, id);
  }

  @Patch('sentence')
  @HttpCode(204)
  sentence(@UserId() userId: string, @Param('id') id: string, @Body() body: unknown): Promise<void> {
    return this.verdicts.setSentence(userId, id, parse(sentenceBody, body));
  }

  @Post('shared')
  @HttpCode(204)
  shared(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.verdicts.shared(userId, id);
  }

  @Post('served')
  @HttpCode(204)
  served(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.verdicts.served(userId, id);
  }

  @Post('confirm')
  @HttpCode(204)
  confirm(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.verdicts.confirm(userId, id);
  }
}
