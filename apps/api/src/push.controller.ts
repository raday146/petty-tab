import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { pushEndpointBody, pushSubscriptionBody } from '@petty-tab/shared';
import { parse } from './errors.js';
import { PushService } from './push.service.js';
import { UserId } from './session.middleware.js';

/** spec §14: this device's push subscription. */
@Controller('push/subscriptions')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  @HttpCode(204)
  subscribe(@UserId() userId: string, @Body() body: unknown): Promise<void> {
    return this.push.subscribe(userId, parse(pushSubscriptionBody, body));
  }

  @Delete()
  @HttpCode(204)
  unsubscribe(@UserId() userId: string, @Body() body: unknown): Promise<void> {
    return this.push.unsubscribe(userId, parse(pushEndpointBody, body).endpoint);
  }
}
