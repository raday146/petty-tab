import { Injectable } from '@nestjs/common';

/** Injected wherever time matters, so tests can travel. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
