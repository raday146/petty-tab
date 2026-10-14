import { Injectable } from '@nestjs/common';
import { checkProposedEnd, deadlineLabel, pushText, type proposalBody } from '@petty-tab/shared';
import type { z } from 'zod';
import { Clock } from './clock.js';
import { ApiError } from './errors.js';
import { Events } from './events.js';
import { PairingService } from './pairing.service.js';
import { PrismaService } from './prisma.service.js';
import { PushService } from './push.service.js';
import { VerdictsService } from './verdicts.service.js';

const CLEAR = { proposalBy: null, proposalEnd: null, proposalAt: null };
const TOO = {
  too_soon: 'Pick a time at least an hour away.',
  too_far: 'Pick a time within the next two weeks.',
};
const noProposal = (): ApiError => new ApiError(409, 'no_proposal', 'That proposal is off the table.');
const notAllowed = (): ApiError => new ApiError(403, 'not_allowed', 'That is not yours to decide.');

/**
 * spec §10: settle now and moving the deadline. Either member proposes, only the partner can say yes, and
 * nothing about the deadline changes until they do. One open proposal per pair, stored on the pair.
 */
@Injectable()
export class DeadlineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly pairing: PairingService,
    private readonly events: Events,
    private readonly push: PushService,
    private readonly verdicts: VerdictsService,
  ) {}

  /** The caller, the partner and the pair, with any cycle that already ended sealed first. */
  private async open(userId: string) {
    const { pairId } = await this.pairing.inPair(userId);
    // An ended cycle seals here rather than on the next sweep, so a proposal never moves an ended cycle.
    await this.verdicts.sealDue(this.clock.now(), { pairId });
    const me = await this.pairing.inPair(userId);
    const them = me.pair.members.find((m) => m.id !== me.id);
    if (!them) throw new ApiError(409, 'pair_incomplete', 'Your partner has not joined yet.');
    return { me, them, pair: me.pair, now: this.clock.now() };
  }

  /** `end` null proposes settling now. */
  async propose(userId: string, body: z.output<typeof proposalBody>): Promise<void> {
    const { me, them, pair, now } = await this.open(userId);
    const end = body.end ? new Date(body.end) : null;
    const refused = end && checkProposedEnd(end, now);
    if (refused) throw new ApiError(422, refused, TOO[refused]);
    const { count } = await this.prisma.pair.updateMany({
      where: { id: pair.id, proposalBy: null },
      data: { proposalBy: me.id, proposalEnd: end, proposalAt: now },
    });
    if (!count) throw new ApiError(409, 'proposal_open', 'There is already a proposal on the table.');
    this.events.emit(pair.id, 'deadline.proposed');
    const name = me.displayName;
    await this.push.notify(
      them.id,
      pushText(
        end
          ? { type: 'move.proposed', name, when: deadlineLabel(end, pair.timezone) }
          : { type: 'settle.proposed', name },
      ),
    );
  }

  /** The partner says yes: settle now seals on the spot, a move takes over the current deadline. */
  async accept(userId: string): Promise<void> {
    const { me, them, pair, now } = await this.open(userId);
    if (!pair.proposalBy) throw noProposal();
    if (pair.proposalBy === me.id) throw notAllowed();
    const end = pair.proposalEnd;
    // A proposed time can go stale while it waits.
    const stale = end && checkProposedEnd(end, now) === 'too_soon';
    // Only one answer to this proposal counts, and only while its cycle is still the current one.
    const { count } = await this.prisma.pair.updateMany({
      where: { id: pair.id, proposalAt: pair.proposalAt, cycleStart: pair.cycleStart },
      data: stale ? CLEAR : { ...CLEAR, cycleEnd: end ?? now },
    });
    if (!count) throw noProposal();
    if (stale) {
      this.events.emit(pair.id, 'deadline.decided');
      throw new ApiError(409, 'too_soon', 'That time is too close now. Propose a new one.');
    }
    if (!end) {
      await this.verdicts.sealDue(now, { pairId: pair.id }, 'verdict.settled');
      return;
    }
    this.events.emit(pair.id, 'deadline.decided');
    const when = deadlineLabel(end, pair.timezone);
    await this.push.notify(them.id, pushText({ type: 'move.accepted', name: me.displayName, when }));
  }

  /** The partner says not yet (settle now) or nope (a move). */
  async decline(userId: string): Promise<void> {
    const { me, them, pair } = await this.open(userId);
    if (!pair.proposalBy) throw noProposal();
    if (pair.proposalBy === me.id) throw notAllowed();
    await this.clear(pair.id, pair.proposalAt);
    const settle = pair.proposalEnd === null;
    await this.push.notify(them.id, pushText({ type: 'proposal.declined', name: me.displayName, settle }));
  }

  /** The proposer takes it back. */
  async withdraw(userId: string): Promise<void> {
    const { me, pair } = await this.open(userId);
    if (pair.proposalBy !== me.id) throw noProposal();
    await this.clear(pair.id, pair.proposalAt);
  }

  private async clear(pairId: string, proposalAt: Date | null): Promise<void> {
    const { count } = await this.prisma.pair.updateMany({ where: { id: pairId, proposalAt }, data: CLEAR });
    if (!count) throw noProposal();
    this.events.emit(pairId, 'deadline.decided');
  }
}
