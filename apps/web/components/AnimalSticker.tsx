import type { ReactNode } from 'react';
import type { Dir, Face, Species } from '@petty-tab/art';
import { Art } from './Art';

interface Props {
  species: Species;
  face?: Face;
  dir?: Dir;
  /** 46 in rows, 70 on the scoreboard, 30 in chips (design.md §5). */
  size: number;
  className?: string;
}

export function AnimalSticker({ species, face = 'plain', dir = 1, size, className }: Props): ReactNode {
  return (
    <Art
      className={className}
      style={{ width: size, height: size, flex: 'none' }}
      draw={(art) => art.stickerHead(species, face, dir)}
    />
  );
}
