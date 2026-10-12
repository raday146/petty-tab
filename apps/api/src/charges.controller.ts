import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { appealBody, fileChargeBody, pleaBody, type TabView } from '@petty-tab/shared';
import { ChargesService } from './charges.service.js';
import { parse } from './errors.js';
import { UserId } from './session.middleware.js';

/** spec §14: the tab and its charges. */
@Controller()
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Get('tab')
  tab(@UserId() userId: string): Promise<TabView> {
    return this.charges.tab(userId);
  }

  @Post('charges')
  file(@UserId() userId: string, @Body() body: unknown): Promise<{ id: string }> {
    return this.charges.file(userId, parse(fileChargeBody, body));
  }

  @Delete('charges/:id')
  @HttpCode(204)
  undo(@UserId() userId: string, @Param('id') id: string): Promise<void> {
    return this.charges.undo(userId, id);
  }

  @Post('charges/:id/plea')
  @HttpCode(204)
  plead(@UserId() userId: string, @Param('id') id: string, @Body() body: unknown): Promise<void> {
    return this.charges.plead(userId, id, parse(pleaBody, body));
  }

  @Post('charges/:id/appeal')
  @HttpCode(204)
  decide(@UserId() userId: string, @Param('id') id: string, @Body() body: unknown): Promise<void> {
    return this.charges.decide(userId, id, parse(appealBody, body));
  }
}
