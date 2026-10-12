import { Injectable } from '@nestjs/common';
import {
  INVITE_TTL_MS,
  inviteStatus,
  type acceptInviteBody,
  type createPairBody,
  type InvitePreview,
  type updateMemberBody,
  type Me,
  type Species,
} from '@petty-tab/shared';
import type { z } from 'zod';
import { Clock } from './clock.js';
import { decrypt, encrypt, newToken, sha256 } from './crypto.js';
import { ApiError } from './errors.js';
import { Prisma } from './generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

/** The invite link path; the web prefixes its own origin (spec §4.2: `https://<host>/j/<token>`). */
export interface InviteLink {
  link: string;
}

const linkFor = (token: string): InviteLink => ({ link: `/j/${token}` });
const invalid = (): ApiError =>
  new ApiError(404, 'invite_invalid', 'This link has expired or was already used.');
const alreadyInPair = (): ApiError => new ApiError(409, 'already_in_pair', 'You already have a tab.');
const speciesTaken = (): ApiError =>
  new ApiError(409, 'species_taken', 'Your partner already picked that animal.');
const isUniqueViolation = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/** spec §3–4: who you are, which pair you are in, and how pairs form and end. */
@Injectable()
export class PairingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** The user's member row in their active (not ended) pair, with both members. */
  private activeMember(userId: string) {
    return this.prisma.member.findFirst({
      where: { userId, pair: { endedAt: null } },
      include: { pair: { include: { members: { orderBy: { joinedAt: 'asc' } } } } },
    });
  }

  async me(userId: string): Promise<Me> {
    const member = await this.activeMember(userId);
    if (!member) return { member: null, pair: null };
    const partner = member.pair.members.find((m) => m.id !== member.id);
    return {
      member: { name: member.displayName, species: member.species as Species },
      pair: {
        complete: !!partner,
        partner: partner ? { name: partner.displayName, species: partner.species as Species } : null,
      },
    };
  }

  /** spec §4.1: the pair, A as its first member, and the first invite link. */
  async createPair(userId: string, body: z.output<typeof createPairBody>): Promise<InviteLink> {
    return this.prisma.$transaction(async (tx) => {
      // ponytail: checked, not constrained; two simultaneous taps could race into two pairs. Add a
      // partial unique index on an active-membership column if that ever shows up.
      if (await tx.member.findFirst({ where: { userId, pair: { endedAt: null } } })) throw alreadyInPair();
      const pair = await tx.pair.create({
        data: {
          timezone: body.timezone,
          members: { create: { userId, displayName: body.name, species: body.species } },
        },
        include: { members: true },
      });
      return this.issueInvite(tx, pair.id, pair.members[0]!.id);
    });
  }

  /** spec §4.2/§4.5: the waiting card's link, the same one again until it expires, then a fresh one. */
  async currentInvite(userId: string): Promise<InviteLink> {
    const member = await this.waitingMember(userId);
    const open = await this.prisma.invite.findFirst({
      where: { pairId: member.pairId, usedAt: null, revokedAt: null, expiresAt: { gt: this.clock.now() } },
      orderBy: { expiresAt: 'desc' },
    });
    return open ? linkFor(decrypt(open.tokenEnc)) : this.issueInvite(this.prisma, member.pairId, member.id);
  }

  /** **New link**: revokes every open link of the pair and issues another. */
  async newInvite(userId: string): Promise<InviteLink> {
    const member = await this.waitingMember(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.invite.updateMany({
        where: { pairId: member.pairId, usedAt: null, revokedAt: null },
        data: { revokedAt: this.clock.now() },
      });
      return this.issueInvite(tx, member.pairId, member.id);
    });
  }

  /** spec §4.3: who invited you. Never consumes the link, whoever looks. */
  async previewInvite(userId: string, token: string): Promise<InvitePreview> {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: sha256(token) },
      include: { creator: true, pair: true },
    });
    if (!invite || invite.pair.endedAt || inviteStatus(invite, this.clock.now()) !== 'valid') throw invalid();
    return {
      inviter: { name: invite.creator.displayName, species: invite.creator.species as Species },
      own: invite.creator.userId === userId,
    };
  }

  /** spec §4.3–4.4: B joins; the link is consumed in the same transaction. */
  async acceptInvite(userId: string, token: string, body: z.output<typeof acceptInviteBody>): Promise<void> {
    const now = this.clock.now();
    try {
      await this.prisma.$transaction(async (tx) => {
        if (await tx.member.findFirst({ where: { userId, pair: { endedAt: null } } })) throw alreadyInPair();
        const invite = await tx.invite.findUnique({ where: { tokenHash: sha256(token) } });
        // Single use: only one accept can flip used_at, so a pair never gets a third member.
        const consumed = invite
          ? await tx.invite.updateMany({
              where: {
                id: invite.id,
                usedAt: null,
                revokedAt: null,
                expiresAt: { gt: now },
                pair: { endedAt: null },
              },
              data: { usedAt: now },
            })
          : { count: 0 };
        if (!invite || consumed.count !== 1) throw invalid();
        await tx.member.create({
          data: { pairId: invite.pairId, userId, displayName: body.name, species: body.species },
        });
      });
    } catch (e) {
      // unique (pair_id, species): the inviter's animal (the link stays usable, the transaction rolled back).
      if (isUniqueViolation(e)) throw speciesTaken();
      throw e;
    }
  }

  /** spec §4.6: your own name or animal; the animal stays unique in the pair. */
  async updateMember(userId: string, body: z.output<typeof updateMemberBody>): Promise<Me> {
    const member = await this.inPair(userId);
    try {
      await this.prisma.member.update({
        where: { id: member.id },
        data: { displayName: body.name, species: body.species },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw speciesTaken();
      throw e;
    }
    return this.me(userId);
  }

  /** spec §4.7: leaving ends the pair for both and kills its open links. Data stays (deleted after 30 days, M7). */
  async leave(userId: string): Promise<void> {
    const member = await this.inPair(userId);
    const now = this.clock.now();
    await this.prisma.$transaction([
      this.prisma.pair.update({ where: { id: member.pairId }, data: { endedAt: now } }),
      this.prisma.invite.updateMany({
        where: { pairId: member.pairId, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  /** The caller's member row with the pair and both members; `not_in_pair` otherwise. */
  async inPair(userId: string) {
    const member = await this.activeMember(userId);
    if (!member) throw new ApiError(404, 'not_in_pair', 'You do not have a tab yet.');
    return member;
  }

  private async waitingMember(userId: string) {
    const member = await this.inPair(userId);
    if (member.pair.members.length > 1)
      throw new ApiError(409, 'not_allowed', 'Your partner already joined.');
    return member;
  }

  private async issueInvite(
    db: Prisma.TransactionClient | PrismaService,
    pairId: string,
    createdBy: string,
  ): Promise<InviteLink> {
    const token = newToken();
    await db.invite.create({
      data: {
        pairId,
        createdBy,
        tokenHash: sha256(token),
        tokenEnc: encrypt(token),
        expiresAt: new Date(this.clock.now().getTime() + INVITE_TTL_MS),
      },
    });
    return linkFor(token);
  }
}
