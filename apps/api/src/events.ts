import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, interval, map, merge, Subject, type Observable } from 'rxjs';
import type { EventType, TabEvent } from '@petty-tab/shared';

const HEARTBEAT_MS = 25_000;

/**
 * spec §14: live updates for a pair. Messages carry only `{ type, chargeId }`; clients refetch the tab.
 * ponytail: in-memory, so one API process; Postgres LISTEN/NOTIFY when there is more than one.
 */
@Injectable()
export class Events {
  private readonly bus = new Subject<TabEvent & { pairId: string }>();

  emit(pairId: string, type: EventType, chargeId?: string): void {
    this.bus.next({ pairId, type, chargeId });
  }

  /** The pair's messages, plus a named `ping` (ignored by `onmessage`) so proxies keep the stream open. */
  forPair(pairId: string): Observable<MessageEvent> {
    return merge(
      this.bus.pipe(
        filter((e) => e.pairId === pairId),
        map(({ type, chargeId }): MessageEvent => ({ data: { type, chargeId } satisfies TabEvent })),
      ),
      interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' }))),
    );
  }
}
