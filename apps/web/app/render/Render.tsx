'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Reel, reelInput, renderWav, type ReelHandle } from '@petty-tab/reel';
import { renderInput, type RenderInput } from '@petty-tab/shared';
import { VerdictCard } from '@/screens/Verdict';

const base64 = (buf: ArrayBuffer): Promise<string> =>
  new Promise((done) => {
    const r = new FileReader();
    r.onload = () => done((r.result as string).split(',')[1]!);
    r.readAsDataURL(new Blob([buf]));
  });

const painted = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));

export function Render({ kind }: { kind: 'card' | 'reel' }): ReactNode {
  const [input, setInput] = useState<RenderInput>();
  const drawn = useRef<() => void>(undefined);
  const reel = useRef<ReelHandle>(null);

  useEffect(() => {
    window.__render = (raw) =>
      new Promise((resolve) => {
        drawn.current = resolve;
        setInput(renderInput.parse(raw));
      });
    window.__reel = {
      seek: async (t) => {
        reel.current?.seek(t);
        await painted();
      },
      wav: async () => base64(await renderWav()),
    };
  }, []);

  useEffect(() => {
    if (!input) return;
    void document.fonts.ready.then(painted).then(() => drawn.current?.());
  }, [input]);

  if (!input) return null;
  if (kind === 'reel') return <Reel ref={reel} input={reelInput(input)} hires />;
  // The card is drawn at its 390px phone width and zoomed to 1080 (1920 tall: the 9:16 export, spec §11).
  // The renderer emulates reduced motion, so the reveal sits on its final state.
  return (
    <div className="h-[693.334px] w-[390px] bg-paper [zoom:2.76923] [&>article]:mt-0!">
      <VerdictCard verdict={input} />
    </div>
  );
}
