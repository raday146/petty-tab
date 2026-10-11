# Petty Tab · the verdict reel

A 6.00-second, 1080×1920 video with sound, generated for every sealed verdict that has a loser. The same
timeline drives the in-app story preview (live, seekable) and the exported MP4 (rendered frame by frame).

Visual targets: `reference/reel-frames/t<seconds>.png`, exported area only, exactly 1080×1920. The working
implementation is the Story screen of `reference/prototype.html` (search for `buildStory`, `track(`, `cue(`).

## 1. Inputs

| Input | Example | Notes |
| --- | --- | --- |
| winner name, species | Maya, `cat` | names inside `<bdi>` |
| loser name, species | Alex, `bear` | |
| sentence text | "7 days of morning coffee duty" | from the verdict |
| top crime stickers | `burrito`, `dish`, `trash` | up to 3 **sticker keys**, mapped from the snapshot's crime keys through the catalog (`dj` → `tape`) |
| handle (preview only) | maya.thecat, @alex | the **viewer's** handle and the **partner's** mention, whichever side won; latin slug of the names, falls back to "you" / "partner" |

## 2. Beats

| Time | Beat | What happens |
| --- | --- | --- |
| 0.00–1.50 | Cold open | Navy screen. Wax seal and "THE VERDICT IS SEALED..." pulse on a double heartbeat; the three dots appear one by one. |
| 1.50–2.50 | Stamp | GUILTY drops from 4.6× and slams at 1.62 with a white flash, screen shake and dust. A cream circle wipes navy away. The stamp holds, then flies to the corner. |
| 2.50–4.50 | Showdown | The picture band opens. The winner slides in on the sofa (crowned, drink in hand), overshoots, winks. The loser stumbles in from the right, gets buried: basket on the head, laundry mound, three crime tokens, plates. Spiral eyes, orbiting stars. |
| 4.50–6.00 | Sentence | Confetti burst. "Alex owes Maya" rises, the sentence drops in with a bounce, the "petty tab" watermark fades in. |

## 3. Stage and layers

The stage is a 1080×1920 box, background navy `#1b2440`. Layers from bottom to top:

| Layer | Geometry | Content |
| --- | --- | --- |
| cold | full stage, flex centred, 64px gap | glow (900px radial crimson circle at left 90, top 450), seal (260px, `art.scenes.seal()`), headline "THE VERDICT / IS SEALED" 124px, 800, line height 1.04, tracking 0.01em, uppercase, `#fcf7ec`; the three dots are separate spans |
| wipe | 200px circle centred at (540, 900) | paper `#fcf7ec` |
| band | left 0, top 420, 1080×912 | butter `#f8e7b5` |
| title | top 262, 40px side margins, centred | "Maya vs. Alex", always winner first (the prototype builds it viewer-first), 108px 800, tracking -0.035em; 84px when the names total more than 12 characters, 66px above 18 |
| scene | left 0, top 420, 1080×912 | the layers of `art.scenes.story()`, each an `<svg viewBox="0 0 270 228">`, so 1 unit = 4px |
| stamp | 880×300 box centred at (540, 900) | "GUILTY", 190px 800, tracking 0.1em, crimson text, 18px crimson border, radius 46, inner 5px border inset 14px at 55% opacity |
| sentence | top 1378, 60px side margins, centred | lead "Alex owes Maya" 58px (names 600 ink, rest mute), then the sentence 104px 800, line height 1.08, tracking -0.03em, balanced wrap, 22px gap |
| watermark | top 1796, centred | "petty tab", 46px 800, mute |
| fx | full stage canvas (rendered at half resolution in the preview) | dust and confetti |
| flash | full stage | white |

Scene layers (`art.scenes.story()` keys) in drawing order: `floor` (floor band at y 170 and its line),
`sofa` (sofa, footstool, shadow), `winner` (with `winnerWink` swapped in for the wink), `sparkles`,
`loserIn` (standing, sad face), `loserBuried` (sitting, dizzy face), `basket`, `laundry`, `tokens[0..2]`,
`plates`, `orbit`. Geometry is returned in `layers.geometry`: winner at (109, 74) on a sofa floor at 189,
loser at x 200 on a floor at 222 (closer to the camera).

## 4. Easing

`lin`; `io` cubic in-out; `out` cubic out `1-(1-p)^3`; `inn` cubic in `p^3`;
`back` overshoot `1 + 2.9(p-1)^3 + 1.9(p-1)^2`; `bounce` the standard ease-out bounce (7.5625 / 2.75).
Keyframes are `[time, value, easing]`; the easing applies to the segment that ends at that key. **A key
without an easing uses `io`** (cubic in-out), not linear; the prototype's `kf()` does `EZ[key[2] || 'io']`.
Before the first key a track holds the first value; after the last key it holds the last value.

## 5. Tracks

Units: x/y in stage px unless marked "units" (×4 px); r in degrees; s scale; o opacity. Origins in stage px
of the layer's own box.

| Layer | Property | Keyframes |
| --- | --- | --- |
| cold | o | 0 → 0 · 0.22 → 1 · 1.60 → 1 · 1.66 → 0 |
| cold headline | s | `1 + 0.055 × hb(t)` |
| seal | s, r | `1 + 0.13 × hb(t)`; r −10 at 0 → −4 at 1.50 (lin) |
| glow | o, s | `0.22 + 0.7 × hb(t)`; `1 + 0.1 × hb(t)` |
| dots 1, 2, 3 | o | 0 → 1 over 0.60–0.66, 0.84–0.90, 1.08–1.14 |
| wipe | s | 0 at 1.60 → 13 at 1.92 (out) |
| flash | o | 0 at 1.60 → 0.9 at 1.63 → 0 at 1.90 (out) |
| stamp | o | 0 at 1.50 → 1 at 1.56 |
| stamp | s | 4.6 at 1.50 → 1 at 1.62 (inn) → 0.92 at 1.68 (out) → 1 at 1.78 (out) → 1 at 2.35 → 0.42 at 2.72 (io) |
| stamp | r | −17 at 1.50 → −8 at 1.62 (inn) → −8 at 2.35 → 7 at 2.72 (io) |
| stamp | x, y | 0 until 2.35 → x 262, y −372 at 2.72 (io); origin centre |
| band | o, sy | visible from 2.30; sy 0 at 2.30 → 1 at 2.58 (out); origin centre |
| title | o, y | o 0 at 2.42 → 1 at 2.66; y −46 at 2.42 → 0 at 2.74 (back) |
| floor | o | 0 at 2.40 → 1 at 2.60 |
| sofa, winner | x (units) | visible from 2.50; −230 at 2.50 → 26 at 2.96 (back) → 26 at 3.30 → 0 at 3.64 (io) |
| winner | y (units) | 0 at 2.90 → −3.5 at 3.00 (out) → 0 at 3.10 (inn) |
| winner | r | 0 at 3.08 → −3.5 at 3.20 (out) → −3.5 at 3.42 → 0 at 3.52; origin (436, 600) |
| winnerWink | x, y, r, o | the same x, y and r tracks and origin (436, 600) as `winner`, so it moves with it; o visible 3.10–3.46 (the plain `winner` face hides for the same span) |
| sparkles | o | 0 at 3.02 → 1 at 3.14 |
| loserIn | o | visible 3.30–3.72 |
| loserIn | x (units), r | x 96 at 3.30 → 0 at 3.64 (out); r 9 · −7 · 6 · −3 · 0 at 3.30 · 3.40 · 3.50 · 3.60 · 3.66; origin (800, 888) |
| loserBuried | o | visible from 3.73 |
| loserBuried | sy | 0.70 at 3.72 → 1.07 at 3.82 (out) → 0.90 at 3.90 → 1.03 at 4.00 → 0.95 at 4.10 → 0.98 at 4.28 → 1 at 4.36; origin (800, 888) |
| loserBuried | sx | 1.14 at 3.72 → 0.96 at 3.82 (out) → 1.05 at 3.90 → 0.99 at 4.00 → 1 at 4.20 |
| basket | o, y (units) | visible from 3.50; fall(3.50, 0.22) |
| laundry | o, y (units) | visible from 3.66; fall(3.66, 0.20) |
| token 1 | o, y, r | visible from 3.80; fall(3.80, 0.18); r −40 → 0 over 3.80–3.98 (lin); origin `geometry.tokenPositions[0]` (x, y) × 4 |
| token 2 | o, y, r | visible from 3.90; fall(3.90, 0.18); r 50 → 0 over 3.90–4.08 (lin); origin `tokenPositions[1]` × 4 |
| token 3 | o, y, r | visible from 4.00; fall(4.00, 0.18); r −30 → 0 over 4.00–4.18 (lin); origin `tokenPositions[2]` × 4 |
| plates | o, y (units) | visible from 4.10; fall(4.10, 0.18) |
| orbit | o | 0 at 3.74 → 1 at 3.82 |
| sentence lead | o, y | o 0 at 4.50 → 1 at 4.70; y 34 at 4.50 → 0 at 4.76 (out) |
| sentence | o, y, s | o 0 at 4.55 → 1 at 4.62; y −300 at 4.55 → 0 at 4.93 (bounce); s 1.2 at 4.55 → 1 at 4.90 (out) |
| watermark | o | 0 at 4.95 → 1 at 5.25 |
| mention tag (preview only) | o, s | o 0 at 3.70 → 1 at 3.84; s 0.6 → 1 at 3.90 (back); rotated −4° |

Helpers:
- `fall(t0, d)`: each piece is visible from t0; y (units) −250 at t0 → 0 at t0+d (inn) → −5 at t0+d+0.06 (out)
  → 0 at t0+d+0.12 (inn).
- `hb(t)`: heartbeat. Sum over beats (0.30, w 1), (0.52, w 0.6), (1.02, w 1), (1.24, w 0.6) of
  `w × (1 − d/0.24)²` for `0 ≤ d = t − beat < 0.24`.
- Continuous loops inside the art (dizzy spirals 1.1s per turn, orbiting stars 1.5s per turn, steam, snore)
  run on CSS. For the export they must be driven from t too: set each animation's `animation-delay` to `−t`
  with `animation-play-state: paused` on every frame, so a frame at time t is always identical.

## 6. Shake, dust and confetti

Shake translates the whole stage (not the preview frame). For each `[t0, amplitude px, length s]` in
`[1.62, 36, 0.5]`, `[3.72, 12, 0.26]`, `[3.86, 7, 0.20]`, `[4.28, 8, 0.22]`, with `d = t − t0` inside the
length and index `i`: `a = amplitude × (1 − d/length)²`, `x += a·sin(74d + i)`, `y += 0.8·a·cos(97d + 2i)`.

Particles are a pure function of t, generated with the seeded `mulberry32` RNG from the prototype (`rng(seed)`),
so every render of the same verdict is identical.

- **Dust** (seed 7, 30 particles, from t = 1.62 for 0.75s). Each starts on a ring around (540, 900):
  angle `a` random, x radius 330–460, y radius 110–180; velocity `(cos a × 260–680, sin a × 160–460 − 90)`.
  30% are crimson ink flecks (radius `7 + 0.12 r0`, alpha 0.9, falling with `520 d²`), the rest tan
  `#cdbf9f` puffs (radius `r0 × (0.5 + 1.5e)`, r0 16–42, alpha 0.5). Progress `k = d/0.75`, eased
  `e = 1 − (1 − k)^2.4`, position `start + v × 0.55e`, alpha × `(1 − k)`.
- **Confetti** (seed 21, 110 pieces, from t = 4.50 for 1.5s). Start (540 ± 80, 1010); angle −90° ± 72°;
  speed 900–2600 px/s; `x = x0 + vx·d·(1 − 0.22d)`, `y = y0 + vy·d + 1500d²`; rectangles 18–34 wide, 16 or
  34–48 tall; spin `rot + vr·d` (vr ±7 rad/s); flip `scaleY = cos(fl + 9d)`; colours mustard, crimson, ink,
  mustard, `#4a63b0`, `#f3b8ad` in rotation; alpha fades over the last 0.25s.

## 7. Audio cues

Synthesised with Web Audio, through a DynamicsCompressor and a 0.45 master gain. `tone(f0, f1, dur, type,
gain, at)`: oscillator gliding exponentially f0 → f1, gain envelope 0.0001 → gain in 8ms → 0.0001 at dur.
`noise(dur, f0, f1, gain, at, q)`: white noise through a band-pass gliding f0 → f1, gain decaying to 0.0001.
`chip(f, dur, at, g)`: square at f (gain g, default 0.1) plus triangle at f/2 (gain 0.9g).

| t | Sound | Recipe |
| --- | --- | --- |
| 0.30 | heartbeat "lub" | tone 74→46 Hz, 0.16s, sine, 0.5 |
| 0.52 | heartbeat "dub" | tone 66→42 Hz, 0.14s, sine, 0.32 |
| 1.02 | lub | tone 74→46 Hz, 0.16s, sine, 0.55 |
| 1.24 | dub | tone 66→42 Hz, 0.14s, sine, 0.36 |
| 1.38 | riser | noise 0.24s, 300→2400 Hz, 0.07, q 0.8 |
| 1.60 | gavel + boom | knock (noise 0.04s 900→700 Hz 0.5 q 2 + tone 230→140 Hz 0.07s sine 0.6); at +0.02: tone 96→30 Hz 0.7s sine 0.95, noise 0.32s 240→60 Hz 0.6 q 0.6, noise 0.05s 2600→900 Hz 0.25 q 1.4 |
| 2.55 | 8-bit fanfare | chip G4 0.09s @0, C5 0.09 @0.10, E5 0.09 @0.20, G5 0.17 @0.30, E5 0.09 @0.50, G5 0.40 @0.60 (g 0.12) |
| 3.30 | slide whistle | sine 1700→330 Hz over 0.40s, vibrato 9 Hz ±18 Hz, gain up to 0.22 in 30ms, held to 0.34, out by 0.42 |
| 3.72 | boing + thump | sine 240→120 Hz over 0.5s with a 21 Hz LFO on frequency, depth 110→4 Hz, gain 0.5 decaying by 0.55s; thump = tone 140→70 Hz 0.12s sine 0.45 + noise 0.05s 400→200 Hz 0.25 q 0.8 |
| 3.86 | thump | as above |
| 3.98, 4.08, 4.18 | token clinks | tone 520→300, 600→340, 690→380 Hz, 0.07s, triangle, 0.2 |
| 4.28 | plates | thump + tone 2300→2100 Hz 0.12s triangle 0.12 + tone 3100→2900 Hz 0.10s triangle 0.07 @+0.03 |
| 4.50 | confetti pop + chord | noise 0.18s 4200→1500 Hz 0.28 q 0.7; chip C5 0.5s g 0.07, E5 0.5s g 0.06, G5 0.5s g 0.06, C6 0.6s @+0.04 g 0.07 |
| 4.90 | sentence lands | tone 150→60 Hz 0.16s sine 0.5 + noise 0.05s 700→300 Hz 0.2 q 0.8 |

The heartbeat, riser and sentence thud were added in the prototype beyond the original brief (stamp boom,
slide whistle and boing, winner fanfare).

## 8. Export

- 1080×1920, 30 fps (180 frames), H.264 High, `yuv420p`, CRF about 18, `+faststart`; AAC 48 kHz stereo
  192 kbps; duration exactly 6.00s.
- The renderer opens a render-only route (`/render/reel/:verdictId?sig=…`) at a 1080×1920 viewport with
  device scale 1, calls `window.__reel.seek(t)` for each frame, waits one animation frame, screenshots, and
  pipes the PNGs to ffmpeg.
- Audio is rendered in the same page with an `OfflineAudioContext` (6s, 48 kHz) from the same cue table, so
  cue times are exact, then returned as WAV and muxed.
- The poster frame for previews is t = 5.95.
- The story-viewer frame (bars, handle, mention tag, reply pill) is never rendered into the file.

## 9. Preview behaviour (in the app)

- Plays on open, loops at 6.00s with a hard cut back to the cold open.
- Hold anywhere on the video to pause (the viewer frame hides while held); release to resume.
- Sound follows the app's sound setting; the speaker icon toggles it.
- Reduced motion: open paused on the final frame (t = 5.7) with a play button.

## 10. Checks and known issues

- **Golden frames**: render frames at the timestamps in `reference/reel-frames/` and compare with pixelmatch;
  allow a small tolerance (around 2% of pixels) for font rasterisation.
- **Safe zones**: Instagram and TikTok draw their own UI over the top and bottom of a story. The title
  (y 262–375) sits close to the top overlay and the sentence's second line (around y 1600–1700) may sit under
  TikTok's caption area. Check against each app's current safe-zone guides and, if needed, move the sentence
  block up by about 120px for the export.
- **Read time**: the sentence is fully readable for only about one second before the loop. Fine for a loop;
  for a single play, consider holding the final frame for 1–2 extra seconds in the export.
