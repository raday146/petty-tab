# @petty-tab/art

The Petty Tab characters, crime stickers, icons and scenes, extracted from the approved prototype. Every
function returns an SVG string. No DOM access and no dependencies, so the same code runs in the browser,
in Next.js server components, in Node and in the reel renderer.

Open `preview.html` to see everything (served over http or straight from disk). `svg/` holds static exports.

## Use in React / Next.js

```tsx
import { useId, useMemo } from 'react';
import { createArt, type Species, type Face } from '@petty-tab/art';
import '@petty-tab/art/art.css'; // once, in app/layout.tsx

export function AnimalSticker({ species, face = 'plain', size = 46 }: { species: Species; face?: Face; size?: number }) {
  const prefix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const svg = useMemo(() => createArt({ idPrefix: prefix }).stickerHead(species, face), [prefix, species, face]);
  return <span style={{ display: 'block', width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

Why one renderer per component: every outlined shape uses `clipPath`s for its rim shadow, and their ids must be
unique on the page. `createArt({ idPrefix })` numbers them `${idPrefix}-0, -1, …`, the same on the server and
the client, so hydration matches. Never share one renderer across components that render in different orders.

`dangerouslySetInnerHTML` is safe here because the markup never contains user input. Keep it that way: never
pass names or other user text into these functions. The optional `label` arguments are for fixed copy only
(they are escaped, but still). For a description with the members' names, wrap the art in an element with
`role="img"` and the label, and call the art without `label` so it renders `aria-hidden`.

Scene `tokens` are **sticker keys** (`tape`), not crime keys (`dj`); map them through the crime catalog.
Unknown keys throw.

## API

| Call | Returns |
| --- | --- |
| `avatar(species, face?)` | Head framed for a round avatar (`SPECIES[sp].vb`) |
| `stickerHead(species, face?, dir?)` | Same framing with the die-cut sticker class `stk` |
| `headSVG(species, face?, dir?)` | Head in a roomy frame (`-62 -86 124 124`) |
| `portrait(species)` | Signature portrait for the picker card, frame `-75 -60 150 107` |
| `figureSVG(species, face, dir, pose, { arms, tilt })` | Full body, frame `-70 -90 140 200` |
| `lumpSVG()` · `cupCrownSVG()` | The Blanket Bear's duvet lump · the coffee-cup crown (also the app icon) |
| `sticker(key)` · `icon(name)` | Crime sticker (64×64) · UI icon (48×48) |
| `scenes.hero()` | Intro household scene, viewBox `0 44 390 292` |
| `scenes.verdict({ winner, loser, tokens })` | Verdict card picture, viewBox `0 -30 350 196` |
| `scenes.story({ winner, loser, tokens })` | The reel's layers (see `docs/reel.md`) |
| `scenes.seal()` | The cold open's wax seal |
| `raw.*` | Inner-markup builders (`head`, `fig`, `bust`, `token`, `sofa`, …) for new compositions |
| `SPECIES`, `ORDER`, `FUR`, `HEADTOP`, `COLORS`, `STICKERS`, `ICONS`, `FACES`, `POSES`, `ARMS` | Data |
| `standalone(svg)` · `STYLE` | Make a string a self-contained .svg file · the stroke CSS it embeds |

Faces: `plain`, `sig` (the species' signature expression), `smug`, `sad`, `strain`, `wink`, `dizzy`.
Poses: `sit`, `lounge`, `stand`. Arms: `rest`, `crossed`, `up`, `hips`, `bell`, `none`. `dir`: 1 looks right,
-1 looks left.

## Styling and animation

`art.css` holds the outline styles (`.d .o`, `.d .t`), the sticker border (`.stk`), a heavier outline option
for tiny renders (`.thick`), and the idle animations used inside the art (side-eye, snore bubble, sweat,
orbiting stars, spinning dizzy eyes…). All of them stop under `prefers-reduced-motion`.

## Scripts

```
node scripts/generate.mjs          # rebuild svg/ and preview.html
node --test test/*.test.mjs         # 10 tests: every species, face, pose, sticker and scene renders,
                                    # ids are unique and SSR-stable, labels are escaped,
                                    # scene tokens are validated
```
