'use client';

import { useState, type ReactNode } from 'react';
import { CRIME_KEYS, type CustomCrimeInput, type RulesInput } from '@petty-tab/shared';
import { Art } from '@/components/Art';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Steps } from '@/components/Steps';
import { CrimeTile } from '@/components/tab/CrimeTile';
import { NewCrime } from '@/components/tab/NewCrime';
import s from './Setup.module.css';

const CYCLES = [
  { days: null, title: 'Weekly', detail: 'Verdict every Sunday at 20:00' },
  { days: 3, title: '3-day sprint', detail: 'Verdict every 3 days at 20:00' },
  { days: 5, title: '5-day battle', detail: 'Verdict every 5 days at 20:00' },
] as const;

/** spec §4, step 2 of 3: the rules the partner will see on the invite and accept by joining. */
export function Setup({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (rules: RulesInput) => Promise<void>;
}): ReactNode {
  const [cycleDays, setCycleDays] = useState<RulesInput['cycleDays']>(null);
  const [first, setFirst] = useState('');
  const [off, setOff] = useState<string[]>([]);
  const [custom, setCustom] = useState<CustomCrimeInput[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const inPlay = CRIME_KEYS.length - off.length + custom.length;

  const create = (): void => {
    setBusy(true);
    void onCreate({
      cycleDays,
      firstEnd: first ? new Date(first).toISOString() : null,
      crimesOff: off as RulesInput['crimesOff'],
      custom,
    }).finally(() => setBusy(false));
  };

  return (
    <Screen className={s.screen} aria-label="Set the rules">
      <div className={s.body}>
        <Steps at={2} />
        <h1 className={s.title}>Set the rules</h1>
        <p className={s.lead}>Your partner sees these on the invite and agrees by joining.</p>

        <fieldset className={s.cycles}>
          <legend>How long is a round?</legend>
          {CYCLES.map((c) => (
            <label key={String(c.days)}>
              <input
                type="radio"
                name="cycle"
                checked={cycleDays === c.days}
                onChange={() => setCycleDays(c.days)}
              />
              <b>{c.title}</b>
              <span>{c.detail}</span>
            </label>
          ))}
        </fieldset>

        <label className={s.first}>
          <span>First verdict (optional)</span>
          <input type="datetime-local" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>

        <h2 className={s.h2}>Crimes in play</h2>
        <div className={s.grid}>
          {CRIME_KEYS.map((k) => (
            <CrimeTile
              key={k}
              crime={k}
              off={off.includes(k)}
              onPick={() => setOff((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))}
            />
          ))}
        </div>

        <h2 className={s.h2}>Your own</h2>
        {custom.length > 0 && (
          <ul className={s.own}>
            {custom.map((c, i) => (
              <li key={i}>
                <Art className={s.sticker} draw={(art) => art.sticker(c.sticker)} />
                <span>
                  {c.title}
                  {c.chore && <small> · daily chore, {c.chore === 'me' ? 'yours' : "your partner's"}</small>}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${c.title}`}
                  onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={s.add} onClick={() => setAdding(true)}>
          + Add your own crime or chore
        </button>
      </div>

      <div className={s.foot}>
        <Button onClick={create} disabled={busy || inPlay === 0}>
          {inPlay === 0 ? 'Keep at least one crime' : 'Create the tab'}
        </Button>
        <button type="button" className={s.back} onClick={onBack}>
          Back
        </button>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="A crime of your own">
        {adding && (
          <NewCrime
            them="your partner"
            onCreate={async (body) => {
              setCustom((c) => [...c, body]);
              setAdding(false);
            }}
          />
        )}
      </Sheet>
    </Screen>
  );
}
