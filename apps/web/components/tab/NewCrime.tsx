'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { STICKERS, type StickerKey } from '@petty-tab/art';
import { UNIT_KEYS, unitLabel, type CustomCrimeInput, type UnitKey } from '@petty-tab/shared';
import { Art } from '../Art';
import { Button } from '../Button';
import s from './NewCrime.module.css';

type Body = CustomCrimeInput;

/**
 * spec §6 and §8: the form for a crime of the pair's own, or a daily chore. Titles are text only: the
 * sticker is drawn from its key, never from anything the user typed (CLAUDE.md).
 */
export function NewCrime({
  them,
  onCreate,
}: {
  them: string;
  onCreate: (body: Body) => Promise<void>;
}): ReactNode {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<UnitKey>('coffee');
  const [sticker, setSticker] = useState<StickerKey>(STICKERS[0]!);
  const [chore, setChore] = useState<Body['chore']>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    setBusy(true);
    void onCreate({ title, description, unit, sticker, chore }).finally(() => setBusy(false));
  };

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={s.field}>
        <span>What&rsquo;s the crime?</span>
        <input
          required
          maxLength={40}
          placeholder="Didn't replace the toilet paper"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className={s.field}>
        <span>In one line</span>
        <input
          maxLength={80}
          placeholder="One lonely square, every single time."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <fieldset className={s.choices}>
        <legend>It costs</legend>
        {UNIT_KEYS.map((u) => (
          <label key={u}>
            <input type="radio" name="unit" checked={unit === u} onChange={() => setUnit(u)} />
            {unitLabel(u)}
          </label>
        ))}
      </fieldset>
      <fieldset className={s.stickers}>
        <legend>Sticker</legend>
        {STICKERS.map((k) => (
          <label key={k} aria-label={k}>
            <input type="radio" name="sticker" checked={sticker === k} onChange={() => setSticker(k)} />
            <Art draw={(art) => art.sticker(k)} />
          </label>
        ))}
      </fieldset>
      <fieldset className={s.choices}>
        <legend>Daily chore?</legend>
        {(
          [
            [null, 'No'],
            ['me', 'Mine'],
            ['them', <bdi key="them">{them}&rsquo;s</bdi>],
          ] as const
        ).map(([value, label]) => (
          <label key={String(value)}>
            <input type="radio" name="chore" checked={chore === value} onChange={() => setChore(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      {chore && <p className={s.note}>Ticked done every day, or it lands on the tab at midnight.</p>}
      <Button type="submit" disabled={busy}>
        Add it
      </Button>
    </form>
  );
}
