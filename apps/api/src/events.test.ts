import { describe, expect, it } from 'vitest';
import type { MessageEvent } from '@nestjs/common';
import { Events } from './events.js';

describe('Events (spec §14)', () => {
  it("delivers a pair's messages to that pair only", () => {
    const events = new Events();
    const got: MessageEvent[] = [];
    const sub = events.forPair('pair-a').subscribe((m) => got.push(m));
    events.emit('pair-a', 'charge.created', 'c1');
    events.emit('pair-b', 'charge.created', 'c2');
    events.emit('pair-a', 'member.joined');
    sub.unsubscribe();
    expect(got).toEqual([
      { data: { type: 'charge.created', chargeId: 'c1' } },
      { data: { type: 'member.joined', chargeId: undefined } },
    ]);
  });
});
