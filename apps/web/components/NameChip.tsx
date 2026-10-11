import type { ReactNode } from 'react';
import type { Species } from '@petty-tab/art';
import { AnimalSticker } from './AnimalSticker';
import s from './NameChip.module.css';

interface Props {
  name: string;
  species: Species;
  onClick?: () => void;
  className?: string;
}

export function NameChip({ name, species, onClick, className }: Props): ReactNode {
  return (
    <button
      type="button"
      className={`${s.chip} ${className ?? ''}`}
      onClick={onClick}
      aria-label="Change your name or animal"
    >
      <AnimalSticker species={species} size={30} />
      <bdi>{name}</bdi>
    </button>
  );
}
