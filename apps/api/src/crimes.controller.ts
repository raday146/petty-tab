import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import { customCrimeBody } from '@petty-tab/shared';
import { CrimesService } from './crimes.service.js';
import { parse } from './errors.js';
import { UserId } from './session.middleware.js';

/** spec §14: the pair's own crimes and daily chores. */
@Controller()
export class CrimesController {
  constructor(private readonly crimes: CrimesService) {}

  @Post('crimes')
  create(@UserId() userId: string, @Body() body: unknown): Promise<{ id: string }> {
    return this.crimes.create(userId, parse(customCrimeBody, body));
  }

  @Delete('crimes/:id')
  @HttpCode(204)
  remove(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.crimes.remove(userId, id);
  }

  @Post('chores/:id/done')
  @HttpCode(204)
  done(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.crimes.done(userId, id, true);
  }

  @Delete('chores/:id/done')
  @HttpCode(204)
  undone(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.crimes.done(userId, id, false);
  }
}
