import type { ReactNode } from 'react';

// Placeholder until the intro screen lands in M1.
export default function Home(): ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="text-[66px] leading-none font-extrabold tracking-[-0.045em]">Petty Tab</h1>
      <p className="text-mute text-[17px]">Keep score of the little things. Settle up on Sunday.</p>
    </main>
  );
}
