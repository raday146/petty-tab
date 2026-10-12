import { z } from 'zod';
import { ORDER, type Species } from '@petty-tab/art';

const graphemes = new Intl.Segmenter();

/** spec §4.1: 1–12 characters after trimming, any script, inner spaces collapsed. */
export const nameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .refine((s) => {
    const n = [...graphemes.segment(s)].length;
    return n >= 1 && n <= 12;
  }, 'Names are 1 to 12 characters.');

export const speciesSchema = z.enum(ORDER as [Species, ...Species[]]);

/** An IANA zone the runtime knows, from the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`. */
export const timezoneSchema = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz !== '';
  } catch {
    return false;
  }
}, 'Unknown timezone.');

export const createPairBody = z.object({
  name: nameSchema,
  species: speciesSchema,
  timezone: timezoneSchema,
});
export const acceptInviteBody = z.object({ name: nameSchema, species: speciesSchema });
export const updateMemberBody = z
  .object({ name: nameSchema.optional(), species: speciesSchema.optional() })
  .refine((b) => b.name !== undefined || b.species !== undefined, 'Nothing to change.');

/** spec §4.2: an invite link is valid for 7 days. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InviteStatus = 'valid' | 'expired' | 'used' | 'revoked';

export function inviteStatus(
  invite: { expiresAt: Date; usedAt: Date | null; revokedAt: Date | null },
  now: Date,
): InviteStatus {
  if (invite.usedAt) return 'used';
  if (invite.revokedAt) return 'revoked';
  return now < invite.expiresAt ? 'valid' : 'expired';
}

/** `GET /api/me` (spec §14). */
export interface Me {
  member: { name: string; species: Species } | null;
  pair: { complete: boolean; partner: { name: string; species: Species } | null } | null;
}

/** `GET /api/invites/:token`. `own`: the viewer created it. */
export interface InvitePreview {
  inviter: { name: string; species: Species };
  own: boolean;
}

/** Every API error body (spec §14). */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
