import { Injectable } from '@nestjs/common';
import type { Me, Species } from '@petty-tab/shared';
import { Clock } from './clock.js';
import { PrismaService } from './prisma.service.js';

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
}
