import type { ReactNode } from 'react';
import { ORDER, SPECIES, type Species } from '@petty-tab/art';
import { AnimalCard } from '@/components/AnimalCard';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import s from './Picker.module.css';

interface Props {
  name: string;
  species: Species;
  /** The partner's animal and name, when joining their tab. */
  taken?: { species: Species; name: string };
  onName: (name: string) => void;
  onSpecies: (species: Species) => void;
  onContinue: () => void;
}

export function Picker({ name, species, taken, onName, onSpecies, onContinue }: Props): ReactNode {
  const shown = name.trim();
  return (
    <Screen className={s.screen} aria-label="Pick your spirit animal">
      <div className={s.head}>
        <h1 className={s.title}>Pick your spirit animal</h1>
        <label className={s.field}>
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            dir="auto"
          />
        </label>
      </div>
      <div className={s.zoowrap} data-testid="zoo">
        <div className={s.zoo}>
          {ORDER.map((sp) => (
            <AnimalCard
              key={sp}
              species={sp}
              selected={sp === species}
              takenBy={taken?.species === sp ? taken.name : undefined}
              onPick={onSpecies}
            />
          ))}
        </div>
      </div>
      <div className={s.foot}>
        <Button onClick={onContinue} disabled={!shown}>
          <span>
            Continue as <bdi>{shown}</bdi> {SPECIES[species].tag.replace('The', 'the')}
          </span>
        </Button>
      </div>
    </Screen>
  );
}
