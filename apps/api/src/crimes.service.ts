import { Injectable } from '@nestjs/common';
import { CUSTOM_CRIMES_MAX, localDay, type customCrimeBody } from '@petty-tab/shared';
import { z } from 'zod';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';

const notFound = (): ApiError => new ApiError(404, 'not_allowed', 'That crime is not on your list.');

/** spec §6 and §8: the pair's own crimes, and ticking a daily chore done. */
@Injectable()
export class CrimesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly pairing: PairingService,
    private readonly events: Events,
  ) {}

  /** Either member adds a crime to the pair's list, or a chore for themselves or the partner. */
  async create(userId: string, body: z.output<typeof customCrimeBody>): Promise<{ id: string }> {
    const me = await this.pairing.inPair(userId);
    const them = me.pair.members.find((m) => m.id !== me.id);
    if (!them) throw new ApiError(409, 'pair_incomplete', 'Your partner has not joined yet.');
    const { chore, ...crime } = body;
    // ponytail: count-then-insert, so two taps at once can make it 31; the cap is a tidiness rule, not a guard.
    if (
      (await this.prisma.customCrime.count({ where: { pairId: me.pairId, removedAt: null } })) >=
      CUSTOM_CRIMES_MAX
    ) {
      throw new ApiError(409, 'too_many_crimes', `Keep it to ${CUSTOM_CRIMES_MAX}. Remove one first.`);
    }
    const { id } = await this.prisma.customCrime.create({
      data: {
        ...crime,
        pairId: me.pairId,
        createdBy: me.id,
        choreOwnerId: chore === 'me' ? me.id : chore === 'them' ? them.id : null,
        createdAt: this.clock.now(),
      },
    });
    this.events.emit(me.pairId, 'crimes.updated');
    return { id };
  }

  /** Out of the picker; charges and verdicts that used it keep reading it. A removed chore stops charging. */
  async remove(userId: string, id: string): Promise<void> {
    const me = await this.pairing.inPair(userId);
    const { count } = z.uuid().safeParse(id).success
      ? await this.prisma.customCrime.updateMany({
          where: { id, pairId: me.pairId, removedAt: null },
          data: { removedAt: this.clock.now() },
        })
      : { count: 0 };
    if (!count) throw notFound();
    this.events.emit(me.pairId, 'crimes.updated');
  }

  /** spec §8: only the chore's owner ticks it, for today in the pair's timezone; unticking works until midnight. */
  async done(userId: string, id: string, done: boolean): Promise<void> {
    const me = await this.pairing.inPair(userId);
    const chore = z.uuid().safeParse(id).success
      ? await this.prisma.customCrime.findFirst({ where: { id, pairId: me.pairId, removedAt: null } })
      : null;
    if (!chore?.choreOwnerId) throw notFound();
    if (chore.choreOwnerId !== me.id) throw new ApiError(403, 'not_allowed', 'That chore is not yours.');
    const now = this.clock.now();
    const day = new Date(localDay(now, me.pair.timezone));
    const key = { crimeId_day: { crimeId: id, day } };
    if (done) {
      await this.prisma.choreDay.upsert({
        where: key,
        create: { crimeId: id, day, doneAt: now },
        update: {},
      });
    } else {
      // Gone, not just unticked: the midnight sweep charges a day that has no row.
      await this.prisma.choreDay.deleteMany({ where: { crimeId: id, day, chargeId: null } });
    }
    this.events.emit(me.pairId, 'chore.updated');
  }
}
