import type { CSSProperties, ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { createArt, FACES, ORDER, SPECIES, STICKERS } from '@petty-tab/art';

// Dev-only gallery of packages/art, laid out like packages/art/preview.html so the two can be compared.
// A static prefix per drawing keeps clip ids unique and SSR-stable (no client component needed here).
export default function ArtGallery(): ReactNode {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="px-4 pt-6 pb-12">
      <h1 className="text-[32px] font-extrabold tracking-[-0.03em]">Petty Tab art</h1>

      <Section title="Signature portraits">
        {ORDER.map((sp) => (
          <Drawing
            key={sp}
            testId={`portrait-${sp}`}
            svg={createArt({ idPrefix: `portrait-${sp}` }).portrait(sp)}
            caption={SPECIES[sp].name}
            style={{
              width: 240,
              height: 171,
              borderRadius: 12,
              overflow: 'hidden',
              background: SPECIES[sp].bg,
            }}
          />
        ))}
      </Section>

      <Section title="Faces">
        {ORDER.flatMap((sp) =>
          FACES.map((face) => (
            <Drawing
              key={`${sp}-${face}`}
              svg={createArt({ idPrefix: `face-${sp}-${face}` }).headSVG(sp, face, 1)}
              caption={`${sp} · ${face}`}
              style={{ width: 110, height: 110 }}
            />
          )),
        )}
      </Section>

      <Section title="Crime stickers">
        {STICKERS.map((key) => (
          <Drawing
            key={key}
            svg={createArt({ idPrefix: `sticker-${key}` }).sticker(key)}
            caption={key}
            style={{ width: 80, height: 80 }}
          />
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section>
      <h2 className="mt-8 mb-3 text-xl font-extrabold">{title}</h2>
      <div className="flex flex-wrap gap-3">{children}</div>
    </section>
  );
}

function Drawing(props: { svg: string; caption: string; style: CSSProperties; testId?: string }): ReactNode {
  return (
    <figure className="bg-paper rounded-[18px] p-2">
      {/* Safe: art markup never contains user input (see packages/art/README.md). */}
      <div
        data-testid={props.testId}
        style={props.style}
        className="[&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: props.svg }}
      />
      <figcaption className="text-mute mt-1 text-center text-[12.5px]">{props.caption}</figcaption>
    </figure>
  );
}
