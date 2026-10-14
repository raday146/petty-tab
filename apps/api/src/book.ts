import { bookFor, type CrimeBook, type StickerKey, type UnitKey } from '@petty-tab/shared';
import type { PrismaService } from './prisma.service.js';

/** spec §6: the catalog plus every crime of the pair's own, removed ones too (old charges keep their title). */
export async function loadBook(
  prisma: Pick<PrismaService, 'customCrime'>,
  pairId: string,
): Promise<CrimeBook> {
  const own = await prisma.customCrime.findMany({ where: { pairId } });
  return bookFor(own.map((c) => ({ ...c, sticker: c.sticker as StickerKey, unit: c.unit as UnitKey })));
}
