# Petty Tab · design

The approved look is in `reference/prototype.html` and `reference/screens/`. This document turns it into
rules and numbers. All sizes are CSS pixels on a 390×844 phone; scale the layout, not the type, on bigger
screens (max content width 480px, centred).

## 1. Direction in one breath

"The Petty Home Court": warm linen and cream, deep navy ink, terracotta reserved for the GUILTY stamp, mustard
for anything active. Friendly geometric type, generous space, one illustrated moment per screen. Charming,
grown-up, never childish, never aggressive.

**Rejected on the way here; do not drift back:** bright arcade stickers, fight-night / boxing arena, food
mascots with gloves, human doodle avatars, antique serif and italics, monospace fine print, docket numbers,
eyebrow labels.

## 2. Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `--linen` | `#f3ead9` | App background |
| `--linen-2` | `#ebe0cc` | Backdrop behind the verdict card |
| `--paper` | `#fcf7ec` | Cards, sheets, inputs, the verdict card |
| `--ink` | `#1b2440` | Text, outlines, primary buttons |
| `--mute` | `#5d6377` | Secondary text |
| `--line` | `rgba(27,36,64,.13)` | Hairlines, dashed dividers, card borders |
| `--crimson` | `#c8402a` | GUILTY stamp only (plus illustration accents) |
| `--mustard` | `#e9b440` | Selected, active, pressed, focus ring, the rope marker |
| `--butter` | `#f8e7b5` | Penalty pills, the plea card, the verdict picture band |
| `--blush` | `#f6d5c8` | Illustration tint |
| `--mist` | `#dfe3ee` | Illustration tint |

Illustration colours (fur, props) live in `packages/art` (`COLORS`, `FUR`); UI code never uses them directly.
Text contrast must stay at or above 4.5:1. Measured: ink on linen 12.8:1, mute on linen 5.0:1, mute on paper
5.6:1, mute on butter 4.9:1. Crimson on linen is only 4.2:1, so crimson is never used for running text; the
stamps it appears in are supplementary (the status is also given as text for screen readers).

## 3. Typography

One family: **Rubik** (Google Fonts), weights 400, 500, 600, 700, 800. It covers Latin and Hebrew, so a Hebrew
name renders in the same face as the English around it. Stack:
`"Rubik", "Heebo", "Arial Hebrew", system-ui, -apple-system, "Segoe UI", sans-serif`.

| Role | Size / line height | Weight | Tracking | Where |
| --- | --- | --- | --- | --- |
| Wordmark | 66 / 1 | 800 | -0.045em, word-spacing 0.1em | Intro logo |
| Verdict names | 38 / 1.05 (30 if names total > 12 chars, 24 if > 18) | 800 | -0.035em | Verdict card headline |
| Screen title | 28–30 / 1.1 | 800 | -0.03em | "Pick your spirit animal", "The Tab" |
| Sentence | 29 / 1.12, balanced wrap | 800 | -0.03em | Verdict card |
| Sheet title | 24 / 1.15 | 800 | -0.025em | Bottom sheets |
| Name under avatar | 18 / 1.15 (15 if > 8 chars) | 700 | 0 | Scoreboard |
| Button | 17 / 1 (15 in the share bar) | 600 | 0 | Primary and outline buttons |
| Row title | 16.5 / 1.25 | 600 | 0 | Crime rows |
| Card title | 15.5 / 1.2 | 700 | 0 | Animal picker cards |
| Body | 15–17 / 1.4 | 400 | 0 | Tagline, sheet copy |
| Small | 13–14 / 1.35 | 400–600 | 0 | Bios, owed labels, chips |
| Pill | 13 / 1 | 600 | 0 | Penalty pills |
| Stamp | 13 (rows) / 17 (verdict) | 700–800 | 0.14em, uppercase | GUILTY, APPEALED |

No italics anywhere. Uppercase is only for stamps and the reel's cold open.

## 4. Space, shape, depth

- Screen gutter 20px (24px for the intro buttons). Top of content 70px (below the status bar).
- Spacing steps: 4, 8, 12, 16, 20, 24, 32. Cards in a grid: 14px horizontal, 16px vertical gaps.
- Radii: pills and buttons 999px; scoreboard 30px; plea card and picker cards 26px; crime picker tiles 24px;
  inputs 20px; sheets 32px top corners; toast 20px. The verdict card is full-bleed with no radius.
- Depth is flat. Only floating things get a shadow: the FAB `0 14px 30px rgba(27,36,64,.3)`, the toast
  `0 16px 36px rgba(27,36,64,.3)`, sheets `0 -20px 50px rgba(27,36,64,.22)`.
- Stickers (animal heads, crime stickers) get a die-cut white border and a soft offset shadow (class `stk` in
  `packages/art/art.css`).
- Tap targets are at least 44×44px.

## 5. Components

| Component | Spec |
| --- | --- |
| Button, primary | 58px tall, full width, ink fill, paper text. Pressed: scale 0.96 and mustard fill. |
| Button, outline | Same size, transparent, 1.5px ink inset ring. |
| Pill | 30px tall, butter fill (paper when it sits on butter), 18px unit icon + "+1 coffee" or "4 coffees". |
| Animal sticker | Head from `art.stickerHead(species, face)`, 46px in rows, 70px on the scoreboard, 30px in chips. |
| Name chip | Paper pill, 42px tall, 30px sticker + name. Used on the intro (who you are). |
| Crime row | Grid: 48px sticker · title (1fr) · pill. 12px vertical padding, no dividers, no meta text. |
| Plea card | Shown to the accused only. Butter card: a crime row, then "<bdi>Maya</bdi> says you did this." with **Guilty** (ink) and **Appeal** (outline) buttons, 40px tall. (The prototype's card reads "Alex pleads…" because it is drawn on the filer's phone; see spec §8.) |
| Appeal card | Shown to the filer only. Same card as the plea card: the crime row, then "<bdi>Alex</bdi> appeals." with **Uphold** (ink) and **Drop** (outline). Uphold slams GUILTY; Drop fades the row to its dropped state. |
| Scoreboard | Paper card. Row 1: my sticker and name · rope + "Maya leads by 5" · partner sticker and name. Row 2 after a dashed line: "Maya is owed" pills · "Alex is owed" pills. |
| Rope | 3px track at 16% ink, a centre tick, a 20px mustard marker with a 2.5px ink ring; moves with a springy 550ms ease. |
| Animal card | Paper card: 120px tinted portrait panel (`art.portrait`), title, one-line bio. Selected: 3px mustard ring and a mustard check badge. Partner's animal: an ink chip with the partner's name. When the count is odd, the last card spans both columns with the portrait on the left. |
| Crime tile | Linen tile: 54px sticker (tilted ±4°), title, pill. |
| Bottom sheet | Paper, 40×4px grab handle, title, content, scrim `rgba(27,36,64,.4)`. |
| Toast | Ink card at the top, bold mustard title line + one sentence. 2.7s. The filing toast adds an **Undo** text button (mustard, end-aligned) and stays 10s; it disappears early if the accused pleads. |
| Stamp | Crimson text and 3px border, slight rotation, ink-texture filter, `mix-blend-mode: multiply`. |

## 6. Screens

Each screen lists its reference image(s) in `reference/screens/`.

How to compare against them:
- Each file is 780×1688 (390×844 at 2×) and covers the phone's screen area only. They include the prototype's
  fake device chrome: a status bar (top 54 CSS px, "9:41", dynamic island) and the home indicator (bottom 21
  CSS px). Mask both bands in Playwright comparisons (`mask` or a clip of `{ y: 54, height: 769 }`).
- `00-desk-overview.png` shows the whole prototype page and is not a comparison target.
- `08-plea-card` and `09-plea-guilty-stamp` are drawn on the filer's phone (a prototype shortcut). Build the
  plea card for the accused with the copy in §5, and compare layout only, not text.
- Name order, the intro's invite button and the link format in the references follow the prototype; where
  this document or the spec says otherwise, the documents win.

### Intro (`01-intro`, `02-invite-sheet`)
Shown only to someone with no pair. The real flow is spec §4: **Start a tab** → picker → invite sheet. The
prototype's "Invite your partner" button and pre-filled name chip are placeholders; drop both from the intro
(a new visitor has no name yet). The invite sheet appears after the picker, and the same content (link,
**Share**, **Copy**, **New link**) is the waiting-state card on the tab.
- Name chip top right (your animal and name), opens the picker. Only once a member exists.
- Wordmark "Petty Tab" centred, mustard squiggle under it (draws in once), tagline "Keep score of the little
  things. Settle up on Sunday."
- `art.scenes.hero()`: the Bear's duvet lump has taken the whole sofa, the Cat judges from the armrest, the
  other seven animals around them.
- Button: **Start a tab** (primary).
- Invite sheet (after the picker): title, one sentence, the `/j/<token>` link with **Copy link**, **Share**,
  and **Open our tab**.

### Pick your spirit animal (`03`–`05`)
- Title, name field ("Your name" label inside the field, bold value, `dir="auto"`).
- Two-column scrolling grid of the nine animal cards; the header stays put, a 14px fade masks the top edge.
- A sticky footer fades in from the linen: **Continue as <bdi>Maya</bdi> the Cat**.

### The Tab (`06`–`10`, `15`)
- Title "The Tab" and a paper chip "Verdict on Sunday" (gavel icon, knocks every few seconds) that opens the
  latest verdict. Before the first verdict it is a plain label, "First verdict Sunday 20:00", with no gavel knock.
- Waiting state (pair not complete): the invite card replaces the scoreboard, no FAB.
- Scoreboard (above). Faces react: the leader's sticker is `smug`, the trailing one `strain`, both `plain` when
  tied.
- Plea cards for every pending charge against the person viewing, and appeal cards for every appealed charge
  the viewer filed, newest first. The full who-sees-what table is in spec §8.
- Crime rows for the week, newest first. The sticker shows the **accused** with a face for the status:
  `plain` pending, `sad` guilty or upheld, `smug` appealed, `plain` dropped. Dropped rows mute the title
  (`--mute`) and hide the pill; appealed rows show a small "Appealed" pill outline in place of the penalty.
- After a plea or an uphold, a GUILTY or APPEALED stamp slams onto the row for 1.9s (the pill hides meanwhile) with a stamp
  sound and a 300ms screen nudge.
- FAB **Log a petty crime** (58px, ink) opens the crime sheet: "What did <bdi>Alex</bdi> do?" and a two-column
  grid of crime tiles. Picking one files it, closes the sheet, bumps the matching pill, and shows a toast with
  the crime's description.

### The Sunday verdict (`11`, `12`, `13`, `16`)
The card is the shareable 9:16 image; the app chrome sits over it and is never part of the export.
- Card (paper, full width, 693px tall on a 390px screen):
  1. Names headline, always **winner first** whoever is viewing: "<bdi>Maya</bdi> vs. <bdi>Alex</bdi>", 64px
     from the top. The prototype builds it viewer-first; it only looks right because its viewer won.
  2. Picture band: `art.scenes.verdict({ winner, loser, tokens })` on butter, full bleed, 218px tall, with the
     GUILTY stamp between the crown and the heap.
  3. Name plates centred under each character: name (16/700) and animal name (12.5, mute).
  4. "<bdi>Alex</bdi> owes <bdi>Maya</bdi>" (15.5, mute with bold names), then the sentence (29/800).
  5. Top crimes as chips: sticker + title + "×2" when repeated.
  6. "petty tab" wordmark at the bottom, mute.
- Chrome: round back button (left), dice and replay buttons (right). Tapping the sentence or the dice opens
  "Pick the sentence" (six options with icons). Dice and the tappable sentence are for the winner before the
  sentence locks; everyone else sees plain text and no dice (spec §10 table).
- Served / confirm: a single outline button under the share bar, per role (spec §10): the loser's "I served
  it", then "Waiting for <bdi>Maya</bdi>" (disabled); the winner's "Confirm it's served" once served. After
  confirmation, a quiet line "Served and confirmed." replaces it.
- Share bar under the card: **Share story** (primary, opens the story preview / share sheet) and **Send to
  WhatsApp** (outline).
- Reveal sequence when the screen opens (timings from screen open): names rise at 0.2s, the heap falls at 0.9s
  (four thuds), GUILTY slams at 1.9s, crown drops with confetti at 2.6s, sentence rises at 3.2s, chips at 3.7s.
- Tie variant. Default layout, build this unless the owner approves another: the same card; headline
  "Dead even" (members in join order underneath, 15.5 mute: "<bdi>Maya</bdi> and <bdi>Alex</bdi>"); the
  picture band shows both animals' `art.portrait(species)` side by side with `plain`-style portraits, no
  stamp, no crown, no heap; the sentence area reads "No one owes anyone. Suspicious." (22/700); no top-crime
  chips; share bar shows **Share card** only (no reel for a tie). No reveal sequence beyond the names rising.

### Story preview (`14`)
Black screen, story-viewer frame: three progress segments (the middle one fills over 6s), avatar + handle
+ "now", mute and close buttons, an "@alex" mention tag, a "Send message" pill with heart and send icons.
The frame is a preview of "your story": the avatar and handle are the **viewer's**, the mention tag is the
**partner's**. The reel inside is identical for both (winner on the left).
Inside, the reel plays from `packages/reel` (`reel.md`). Hold to pause.

## 7. Motion

- One orchestrated moment per screen (the verdict reveal, the reel). Everything else is a response to a tap.
- Screen change: 260ms fade + 320ms slide of 22px, `cubic-bezier(.2,.8,.3,1)`.
- Sheet: 380ms `cubic-bezier(.2,.9,.3,1.08)`. Press: scale 0.96, 120ms springy ease.
- Stamp slam: from scale 2.6 to 1 with a small overshoot, 340ms `cubic-bezier(.5,0,.9,.4)`.
- Character idle loops (blinks, side-eye, snore bubble, sweat drops) come from `packages/art/art.css`. Pause
  them when their screen is hidden.
- `prefers-reduced-motion`: no idle loops, no shake, sequences jump to their final state, the reel opens on its
  last frame with a play button.

## 8. Sound

All UI sounds are synthesised with the Web Audio API (no audio files), through a compressor and a 0.45 master
gain, and only after the first user gesture. A sound toggle lives in settings and on the story preview.

| Sound | Recipe |
| --- | --- |
| tap | sine 520→430 Hz, 50ms |
| pop | sine 660 Hz 70ms, then 990 Hz 160ms |
| knock | band-passed noise 900→700 Hz 40ms + sine 230→140 Hz 70ms |
| gavel | two knocks 220ms apart |
| stamp | sine 150→50 Hz 200ms + band-passed noise 800→300 Hz 60ms |
| paper | band-passed noise 3200→1300 Hz 200ms |
| thump | sine 140→70 Hz 120ms + noise 400→200 Hz 50ms |
| chime | sines 1319, 1760, 2637 Hz staggered 80ms |

Exact gains and envelopes: see the `sfx` object in `reference/prototype.html`. The reel's sounds are in
`reel.md`.

## 9. Voice and copy

Sentence case, plain verbs, short. The joke lives in the crime and sentence names; the UI around them stays
calm. Buttons say what happens ("Log a petty crime", "Share story", "Continue as Maya the Cat").

Examples: "Keep score of the little things. Settle up on Sunday." · "Alex pleads guilty. No contest." · "Alex
appeals. Maya decides." · "Maya says you did this." · "Alex owes Maya" · "Dead even".

## 10. Accessibility and languages

- Visible focus: 2.5px mustard outline, 2px offset.
- Every illustration has a text alternative describing the scene with the members' names. Put it on a wrapper
  element (`<div role="img" aria-label="Maya the Cat wins; Alex the Bear is buried in laundry">`) and call
  the art functions without `label`, so no user text enters `packages/art`. Decorative art is `aria-hidden`.
- Status that only shows as a face also has visually hidden text (", Alex, guilty").
- Names: `<bdi>` everywhere, `dir="auto"` on the name input, logical CSS properties throughout, so a Hebrew UI
  later is a translation job, not a layout job.
