import { Controller, Sse, type MessageEvent } from '@nestjs/common';
import { from, switchMap, type Observable } from 'rxjs';
import { Events } from './events.js';
import { PairingService } from './pairing.service.js';
import { UserId } from './session.middleware.js';

/** `GET /api/events`: the caller's pair's live stream (spec §14). */
@Controller()
export class EventsController {
  constructor(
    private readonly events: Events,
    private readonly pairing: PairingService,
  ) {}

  @Sse('events')
  stream(@UserId() userId: string): Observable<MessageEvent> {
    return from(this.pairing.inPair(userId)).pipe(switchMap((me) => this.events.forPair(me.pairId)));
  }
}
