import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { proposalBody } from '@petty-tab/shared';
import { DeadlineService } from './deadline.service.js';
import { parse } from './errors.js';
import { UserId } from './session.middleware.js';

/** spec §14: settle now and moving the deadline. */
@Controller('deadline/proposal')
export class DeadlineController {
  constructor(private readonly deadline: DeadlineService) {}

  @Post()
  @HttpCode(204)
  propose(@UserId() userId: string, @Body() body: unknown): Promise<void> {
    return this.deadline.propose(userId, parse(proposalBody, body));
  }

  @Post('accept')
  @HttpCode(204)
  accept(@UserId() userId: string): Promise<void> {
    return this.deadline.accept(userId);
  }

  @Post('decline')
  @HttpCode(204)
  decline(@UserId() userId: string): Promise<void> {
    return this.deadline.decline(userId);
  }

  @Delete()
  @HttpCode(204)
  withdraw(@UserId() userId: string): Promise<void> {
    return this.deadline.withdraw(userId);
  }
}
