# Petty Tab · build plan

Each milestone starts in plan mode: restate its "done when" list, propose the steps, wait for approval.
Tick items only with evidence (a test name, a screenshot path, a command output). Keep the status line of
each milestone current.

**MVP cut line.** M0–M4 plus the card PNG from M5 is enough to put two real couples on it and see whether they
come back the next week. The reel MP4, push and launch hardening can follow once that answer is yes.

Versions chosen at M0 (2026-10-11): Node 24 LTS · pnpm 12.11.2 · TypeScript 6.0.3 · Next.js 16.4.0 · React 19.3.0 ·
NestJS 12.1.2 · Prisma 7.10.0 · PostgreSQL 18 · Tailwind 4.3.3 · Playwright 1.64.0 · Vitest 5.0.3 · ESLint 10.12.0 ·
typescript-eslint 8.71.1 · Prettier 3.9.10. TypeScript stays on 6.0 because typescript-eslint supports `<6.1`;
Prisma stays on 7.10 because npm's `latest` tag points at an 8.0 release candidate.

---

## M0 · Foundations
Status: done (PR #1, `feat/m0-foundations`)

- pnpm monorepo with `apps/web`, `apps/api`, `apps/renderer`, `packages/shared`, `packages/art`,
  `packages/reel`; TypeScript strict everywhere; ESLint and Prettier.
- Copy `assets/characters` to `packages/art` unchanged (it is already an ESM package, `@petty-tab/art`);
  `assets/` stays as the untouched original. Add TypeScript types from its `index.d.ts`.
- Docker Compose with Postgres; `.env.example` for every variable.
- Web: Next.js App Router, Tailwind with the tokens from `design.md` §2 as CSS variables, Rubik loaded,
  `packages/art/art.css` imported globally.
- API: NestJS with a `/api/health` endpoint and Prisma connected.
- A dev-only route `/dev/art` that renders every portrait, face and sticker from `packages/art`.
- CI (GitHub Actions): install, lint, typecheck, unit tests.

Done when:
- [x] `docker compose up -d db && pnpm dev` serves the web app and `/api/health` returns ok
      (`/`, `/dev/art` 200; `/api/health` through the Next rewrite → `{"status":"ok","db":"ok"}`, 503 with the
      db stopped; unit tests `apps/api/src/health.controller.test.ts`)
- [x] `/dev/art` shows all nine portraits and they match `assets/characters/preview.html`
      (`apps/web/e2e/art.spec.ts` "/dev/art draws the nine portraits like preview.html": 8 of 9 pixel-identical,
      the cat's "4/10" sign within 1% for font anti-aliasing; screenshots attached to the Playwright report)
- [x] `pnpm lint && pnpm typecheck && pnpm test` pass locally and in CI
      (local: pass, also from a clean clone with `--frozen-lockfile`; CI: green on PR #1,
      https://github.com/raday146/petty-tab/actions/runs/38150717909)
- [x] The art package's own tests (`node --test`) run as part of `pnpm test` (`packages/art test: ℹ pass 10`)
- [x] The commands section of `CLAUDE.md` matches the real scripts

Notes from M0:
- Compose runs `db` only; the api, web and renderer services arrive with M5 and M7.
- The browser reaches the API on the same origin: Next rewrites `/api/*` to Nest (`API_URL`, default :3001).
- `--sans` is the font token: art.css reads it for text inside drawings, Tailwind's `font-sans` reuses it.
- pnpm 12 fails CI installs on unapproved build scripts; approved ones are listed under `allowBuilds` in
  `pnpm-workspace.yaml` (Prisma only so far).
- e2e runs Next on port 3100 so it never reuses another local server on :3000.

## M1 · Design system and static screens
Status: done (`feat/m1-design-system`); differences approved by the owner on 2026-10-11

- Components from `design.md` §5: Button, Pill, AnimalSticker, NameChip, CrimeRow, PleaCard, Scoreboard
  with Rope, AnimalCard, CrimeTile, Sheet, Toast, Stamp. A React wrapper `<Art>` that calls
  `createArt({ idPrefix: useId() })`.
- Every screen from `design.md` §6 built with mock data, reachable under `/dev/screens/*`: intro, invite sheet,
  picker, tab (complete and waiting), log sheet with the Undo toast, plea card (accused), appeal card (filer),
  verdict card (winner, loser, locked, tie), sentence sheet. Motion and the verdict reveal sequence included.
- Playwright screenshot tests at 390×844 against `reference/screens/`, masking the fake status bar and home
  indicator (see `design.md` §6, "How to compare"). Plea and appeal cards follow the spec's who-sees-what
  table, not screens 08–09's perspective.

Done when:
- [x] Each screen's screenshot test passes against its reference image, with an agreed tolerance, or each
      difference is listed and approved (`apps/web/e2e/screens.spec.ts`; agreed tolerance 2% of pixels, a pixel
      differing when a channel is more than 32/255 apart; status bar, home bar and bezel corners masked; per-screen
      ratios and diff images in the Playwright report. Measured: 01 4.21%, 02 2.72%, 03 1.64%, 04 1.61%,
      05 1.46%, 06 0.93%, 07 0.75%, 08 1.61%, 09 1.55%, 10 1.37%, 11 0.88%, 12 1.86%, 13 1.25%, 15 1.38%,
      16 2.90%. 01, 02 and 16 run on their own thresholds, see the differences below)
- [x] Hebrew name test: the tab and verdict render "מאיה" correctly (compare `15-` and `16-` references)
      ("the tab › Hebrew name matches 15", "the verdict › Hebrew name matches 16")
- [x] Reduced motion: the verdict opens at its final state; no idle loops run
      (`apps/web/e2e/a11y.spec.ts` "reduced motion › <screen>: nothing animates" on every dev screen, and
      "the verdict opens on its final state")
- [x] Keyboard: every control reachable, focus ring visible
      (`a11y.spec.ts` "keyboard › <screen>: every control is reachable with a visible focus ring", and "the log
      sheet opens, traps focus and closes with Escape")

Differences from the references (approved 2026-10-11):
1. 01 intro (5% threshold): no name chip and no "Invite your partner" button, per design.md §6.
2. 02 invite sheet (3.5%): the real `/j/<token>` link, and no name chip behind the scrim. The sheet also gains
   a **Share** button in the link row (only where the phone has a share sheet), which design.md §6 asks for
   but the reference does not show.
3. 16 Hebrew verdict (3%): the reference caught confetti mid-fall; under reduced motion there is none.
4. 03 picker: the bear's portrait panel is not compared, because the reference caught it mid-snore.
5. 06–10, 15: the prototype's burrito row is "appealed" but still shows a penalty pill. The mock marks it
   guilty, because an appealed charge the viewer filed would be an appeal card (spec §8).
6. 08–09 are drawn from the filer's phone. Here it is Maya's phone, with Alex having filed "Snooze Roulette"
   against her: "Alex says you did this." The pleading toast reads "You plead guilty / No contest." (or "You
   appeal / Alex decides."), so the viewer is never named in the third person.
7. 07 log sheet: ten crime tiles, not nine (spec §6 adds Car DJ Crimes).
8. Screens without a reference, attached to the report for review: waiting tab (invite card with Share, Copy,
   New link), appeal card, loser verdict (the served button sits under the share bar, so the screen scrolls),
   locked verdict, tie verdict (both signature portraits, because `art.portrait` has no face option).

Notes from M1:
- Components use CSS Modules ported from the prototype, colours only through tokens; shadows and the scrim are
  built from `--ink` with `color-mix`.
- `body` line-height is back to `normal`; Tailwind's preflight 1.5 shifted every unset element against the
  references.
- The verdict reveal is CSS on delays from screen open. Base styles are the final state, so reduced motion and
  tests can freeze any moment through `document.getAnimations()`.
- `@petty-tab/shared` ships TypeScript source with `.ts` import extensions (Turbopack does not map `.js` to
  `.ts` in workspace packages). The API will need Node 24 type stripping or a build step to use it (M2).
- `DIFF_DIR=<dir> pnpm e2e` writes each screen's screenshot and diff image there and prints the ratios.

## M2 · Identity and pairing
Status: done (`feat/m2-identity-pairing`); differences approved by the owner on 2026-10-12

- Anonymous session cookie (spec §3); Prisma models `users`, `sessions`, `pairs`, `members`, `invites`.
- Start a tab, invite link, join page, taken animal rule, waiting state, rename and change animal, leave pair
  (spec §4).

Done when:
- [x] Unit tests for name validation, invite token lifecycle (expiry, single use, revoke, re-display while
      waiting) and the unique-animal rule
      (`packages/shared/src/identity.test.ts` "nameSchema", "inviteStatus"; `apps/api/src/pairing.service.test.ts`
      "invite link lifecycle" › re-displays the same link while waiting, replaces an expired link the next time
      the waiting card loads, New link revokes the previous one, is single use; "join" › refuses the inviter's
      animal and keeps the link usable; "rename, change animal, leave" › refuses the partner's animal)
- [x] Opening an invite while already in a pair shows the "You already have a tab" page and does not consume it
      (`pairing.service.test.ts` "refuses someone already in a pair and does not consume the link";
      `apps/web/e2e/pairing.spec.ts` "an invite opened while already in a pair is not consumed")
- [x] E2E with two browser contexts: A starts a tab, B opens the link, picks a different animal, both see the
      completed pair within 2 seconds
      (`pairing.spec.ts` "A starts a tab, B joins with another animal, both see the pair", 2 s timeouts)
- [x] Expired, used and unknown links show the friendly page
      (`pairing.spec.ts` "used and unknown links show the friendly page"; expired is the same API answer,
      `invite_invalid`, covered with the injected clock in "replaces an expired link…", because e2e cannot move
      the API clock)

Notes from M2:
- The API uses `@petty-tab/shared` without a build step: `rewriteRelativeImportExtensions` in the API tsconfig,
  Node 24 strips shared's types at runtime, and `erasableSyntaxOnly` in shared keeps it strippable.
- IDs come from Postgres 18's `uuidv7()`. Sessions and invite tokens are 128-bit, stored as sha256; invite
  tokens are also stored AES-256-GCM encrypted with `INVITE_KEY` for re-display.
- The API tests use the real database (`docker compose up -d db`, migrated); CI runs a Postgres service.
- `pnpm e2e` also starts the API (`build` + `start` on :3001, or reuses a running one).
- The waiting tab polls `/api/me` every second; SSE `member.joined` replaces it in M3.
- The complete tab has no FAB until filing lands in M3. An empty owed list reads "nothing" (spec §9).

Differences from the design (no design.md screen for these yet; approved by the owner on 2026-10-12, with the
spec §14 changes):
1. The name chip sits at the top end of the tab and opens the picker to rename or change animal. "Leave the
   tab" is a text button under Continue on that picker, with an in-place "This ends the tab for both of you."
   confirm (Stay / Leave the tab).
2. The join picker shows "<name> the <animal> invited you." with the inviter's sticker above the title.
3. The friendly pages reuse the intro layout (title, hero scene, one button): "This link has expired or was
   already used." with **Start a tab**, and "You already have a tab with <name>." with **Open your tab**.
   When the visitor's own pair is still waiting there is no partner name, so it reads "You already have a tab."

## M3 · The tab
Status: done (PR #4, `feat/m3-the-tab`, merged 2026-10-12)

- Crime catalog in `packages/shared`; filing, undo within 10s, 24-hour filing limit; pleas and appeal
  resolution with the state machine of spec §8; auto-guilty after 24 hours (job).
- Scoring (spec §9) as pure functions; `/api/tab`; SSE `/api/events` for live updates.
- The tab screen wired to real data: scoreboard faces, rope, owed pills, plea cards, rows, log sheet, stamp
  animation on pleas.

Done when:
- [x] Unit tests cover every transition in the plea state machine and the worked scoring examples in spec §9
      (`packages/shared/src/charges.test.ts` "transition: the plea state machine" — all four transitions, wrong
      actor, second plea, decision on a non-appeal, 24 h silence, no time limit on appeals; `score.test.ts`
      "tally (spec §9 worked examples)" — the four table rows verbatim, with their rope positions)
- [x] Undo is refused after a plea; undone charges do not count toward the limit; the held push is cancelled
      (`apps/api/src/charges.service.test.ts` "undo › is refused after a plea", "filing › does not count undone
      charges toward the limit", "undo › cancels the held push": the pg-boss job goes `created` → `cancelled`)
- [x] B appeals, A sees the appeal card live and upholds; the row shows GUILTY and the pill counts again
      (`apps/web/e2e/tab.spec.ts` "B appeals, A sees the appeal card live and upholds; the charge counts again":
      2 s timeouts; both sides show the upheld row, the stamp and "1 coffee")
- [x] E2E: A files "Trash Jenga", B sees a plea card live, pleads guilty, A sees the stamp and the pill bump
      (`tab.spec.ts` "A files Trash Jenga, B pleads guilty live, A sees the stamp and the pill bump": the pill
      re-mounts with its bump class, and A's Undo disappears once the plea arrives)
- [x] The 11th charge in 24 hours is refused with the friendly message
      (`tab.spec.ts` "the 11th charge in 24 hours is refused with the friendly message"; the rolling window and
      its reopening a day later in `charges.service.test.ts` "filing › refuses the 11th charge…")
- [x] Undo inside 10 seconds removes the charge for both members
      (`tab.spec.ts` "Undo inside 10 seconds removes the charge for both"; refused at 10 s in "undo › is refused
      at 10 seconds")

Notes from M3:
- Charges live in `charges` (status is a Postgres enum). `week_start` comes from `currentWeek()` in shared
  (first week from the partner's join to the first Sunday 20:00 ≥ 48 h later); M4 adds the timezone and DST
  time-travel suite, `week_closed` and sealing.
- pg-boss 12.34.0 runs on the same Postgres (`pgboss` schema). `charge-push` holds each charge's push 10 s with
  the charge id as job id, so undo cancels it; its handler is a no-op until M6. `auto-guilty` runs every
  minute and resolves silent charges at the 24-hour mark; pleas past 24 h are refused by `transition()`, so
  the sweep's lag never changes an outcome.
- `/api/events` is an in-memory per-pair bus (one API process; Postgres LISTEN/NOTIFY if that changes). Every
  message, and every reconnect, makes the web refetch `/me` and `/tab`; the waiting poll is gone. A named
  `ping` every 25 s keeps proxies from closing the stream. SSE passes through the Next rewrite without buffering.
- The tab infers live stamps from status changes: the filer's charge going pending → guilty stamps and bumps
  the pill, the accused's charge going appealed → upheld stamps. Own pleas and decisions stamp where tapped.
- Under reduced motion the stamp slam is not drawn (M1 behaviour); `tab.spec.ts` runs with motion on.
- Dev-screen screenshot ratios are unchanged from M1/M2.

## M4 · The Sunday verdict
Status: done (PR #5, `feat/m4-sunday-verdict`, merged 2026-10-12); defaults approved by the owner on 2026-10-12

- Week windows in the pair timezone (spec §10), sealing job every 5 minutes (pg-boss), idempotent sealing,
  verdict snapshot, top crimes, seeded random sentence, sentence change window and lock, served / confirmed
  flow, unconfirmed sentence banner on the tab, tie verdict (default layout in `design.md` §6),
  `POST /verdicts/:id/shared` locking the sentence, verdict controls per role.
- Verdict screen on real data with the reveal sequence; the sentence sheet.

Done when:
- [x] Time-travel tests with an injected clock: sealing at Sunday 20:00 in Asia/Jerusalem, America/New_York
      and Pacific/Auckland, including a DST change week
      (`packages/shared/src/week.test.ts` "endedWeeks (spec §10 sealing)": one second before / at Sunday 20:00,
      the week across each zone's DST change (Jerusalem 2026-10-25, New York 2026-11-01, Auckland 2026-09-27 and
      2026-04-05), and catching up on missed weeks; `apps/api/src/verdicts.service.test.ts` "sealing at Sunday
      20:00 local (spec §10), time travel" does the same end to end against the database for all three zones)
- [x] Sealing twice produces one verdict
      (`verdicts.service.test.ts` "idempotent sealing": two concurrent runs plus a third; the unique
      `(pair_id, week_start)` key makes a second seal a no-op)
- [x] Writes against a charge after its `week_end` but before sealing are refused with `week_closed`
      (`verdicts.service.test.ts` "week_closed › refuses undo, plea and appeal decisions after week_end, before
      the sealer runs")
- [x] The winner's first share locks the sentence; the loser's share does not
      (`verdicts.service.test.ts` "the sentence › locks at the winner's first share…" and "locks at Monday 20:00
      local without a share"; `apps/web/e2e/verdict.spec.ts` "Maya wins the week…": the dice stays after Alex
      shares and goes after Maya shares)
- [x] Tie, unresolved appeal and still-pending charge cases match spec §10
      (`packages/shared/src/verdict.test.ts` "judge (spec §10)"; `verdicts.service.test.ts` "the sealed week ›
      persists pending as guilty and unresolved appeals as dropped, resolved at week_end" and "calls a tie…";
      `verdict.spec.ts` "a tie: Dead even, no sentence, nothing owed")
- [x] The verdict screen matches `reference/screens/12-verdict-card.png` (winner's view; names winner first)
      (`verdict.spec.ts` "Maya wins the week…" seals real charges and passes `expectMatchesReference` on
      `12-verdict-card.png` at the default tolerance; the loser's phone also reads "Maya vs. Alex")
- [x] If the owner has not approved the tie layout by then, the default is built and flagged in the summary
      (the `design.md` §6 default, approved by the owner on 2026-10-12 with the other M4 defaults)

Notes from M4:
- `verdicts` has a unique `(pair_id, week_start)`; the sealer inserts with `ON CONFLICT DO NOTHING` inside the
  transaction that also persists the final charge statuses. The sentence is seeded by the new row's id.
- The sealer walks every week from the pair's last verdict (or the partner's join) with `endedWeeks()`, so a
  sealer that was down catches up oldest first. An empty week seals as a "Dead even" verdict (spec §10 read
  literally; flagged).
- `week_closed` is checked once, in `ChargesService.charge()`, which undo, plea and decide all go through.
- Members now take `joined_at` from the injected clock (it was the database's `now()`), so weeks can time-travel.
- `POST /api/dev/seal` exists only with `E2E_HOOKS=1`. It seals the caller's current week as if its Sunday
  20:00 had come, without moving any other pair's clock, so e2e spec files still run in parallel.
- Not in M4: card and reel render jobs (M5), the share sheet itself (M5; the share buttons already call
  `POST /verdicts/:id/shared`), and the verdict pushes (M6). The unconfirmed line has no reference screen: a
  quiet centred line under the scoreboard. The verdict does not open by itself when sealed; the chip opens it.
- Screenshot ratios of the dev screens are unchanged from M1–M3.

## M5 · Shareables
Status: done (PR #6, `feat/m5-shareables`, merged 2026-10-12); defaults and tolerances approved by the owner on 2026-10-12

- `packages/reel`: the timeline from `reel.md` as data plus a React player with `seek(t)`, play, loop,
  hold-to-pause; used by the story preview screen.
- Render routes in `apps/web` for the card and the reel; `apps/renderer` worker (Playwright + ffmpeg) fed by
  pg-boss jobs; offline audio render; storage with signed URLs.
- Share button with the Web Share API (files) and a download fallback; "Send to WhatsApp".

Done when:
- [x] The card PNG is exactly 1080×1920 and matches the verdict card layout
      (`apps/web/e2e/export.spec.ts` "the card PNG is exactly 1080×1920" reads the IHDR of the renderer's own
      output; `render.spec.ts` "verdict card › is exactly 1080×1920 and matches the verdict card of
      12-verdict-card.png" shrinks the export to the reference's 2× card box: 2.7%, see notes)
- [x] Reel frames at every timestamp in `reference/reel-frames/` match within tolerance
      (`render.spec.ts` "reel frames": all 21 at ≤ 2.6%, limit 3%, see notes)
- [x] `ffprobe` on the MP4: 1080×1920, 30 fps, 6.00s ±1 frame, H.264 yuv420p, AAC 48 kHz
      (`export.spec.ts` "the reel MP4 matches reel.md §8…": h264 High, yuv420p, 30/1, AAC 48000 Hz stereo)
- [x] The same verdict rendered twice produces identical frames
      (`export.spec.ts`: two full renders give the same 180 frame hashes; `render.spec.ts` "the same t twice is
      the same frame"; reel unit test "particles are seeded")
- [x] Sharing works on iOS Safari and Android Chrome (manual check, recorded in this file)
      (verified by the e2e share mocks, accepted by the owner on 2026-10-12: `verdict.spec.ts` hands the real
      MP4 to a stubbed `navigator.share`, and a tie's card downloads where files cannot be shared; the check on
      physical phones follows on the staging deployment)

Notes from M5:
- Pipeline: sealing (and every sentence change) queues `render` jobs on pg-boss with the snapshot as a
  `renderInput` (shared zod schema). `apps/renderer` opens `/render/card` or `/render/reel` at 1080×1920, hands
  the input to `window.__render()`, screenshots the card or seeks the reel frame by frame into ffmpeg with the
  `OfflineAudioContext` WAV, writes `STORAGE_DIR/verdicts/<id>/<kind>-<sentence>.<ext>` (via a `.part` file and
  a rename) and reports on the `rendered` queue. The API keeps a render only if its key still matches the
  current sentence, sets `card_url`/`reel_url` (the storage key) and emits `verdict.updated`. A reel takes
  about 14 s, a card 0.3 s.
- The render routes take their input from the renderer instead of loading `/render/reel/:id?sig=…`
  (`reel.md` §8 updated): they are pure, need no database access and no signed page URL.
- Files: `GET /verdicts/:id/card|reel` 302s to `/api/files/verdicts/<id>/<name>?exp&sig`, HMAC-SHA256 with
  `FILES_KEY`, valid 5 minutes, served from `STORAGE_DIR` with Range support (iOS needs it for MP4). S3 with
  presigned URLs and the Docker renderer service move to M7 with the rest of deployment.
- Deliberate differences: the reel references were captured from the prototype's rounded story viewer (black
  corners and a 1px side edge, ignored) and are softer than a crisp 1080 render: every edge differs by about a
  pixel at the best alignment (0, 0), so the limit is 3% instead of about 2%. The card comparison shrinks
  1080 → 780 (resampling, 2.7%) and the reference's sparkles are mid-twinkle (0.1%). The story preview matches
  `14-story-viewer.png` at t = 5.5 within 4%: the reference caught its confetti at another moment.
- Defaults approved by the owner on 2026-10-12, with the 3% reel, 2.7% card and 4% story preview tolerances
  and the `reel.md` §8 change: "Send to WhatsApp" opens the share sheet with the reel (the user
  picks WhatsApp); where files cannot be shared it opens `wa.me` with "Alex owes Maya: <sentence>". "Share
  story" opens the story preview with the share sheet over it. Share buttons read "Printing…" until the file is
  fetched (the sheet must open inside the tap). The export keeps reel.md's positions (no safe-zone shift, no
  extra hold).
- The e2e run starts `apps/renderer` too; the API tests delete the render jobs they queue.
- Known flake, older than M5 (fails the same way on `main`): `screens.spec.ts` "the GUILTY stamp matches 09"
  differs by 13.7% when run alone (the plea card's collapse is still running at the frozen frame) and passes in
  the full run.

## M6 · PWA and notifications
Status: done (PR #7, `feat/m6-pwa-push`, merged 2026-10-12); defaults approved by the owner on 2026-10-12,
real-phone push check on staging approved as deferred (it moves into the M7 phone test plan)

- Web app manifest (name, theme colours, icons from the coffee-cup crown), service worker with an offline
  shell, an install hint (with the iPhone "Add to Home Screen" steps).
- Web Push with VAPID: subscription storage, the events and texts of spec §12, batching, the Wednesday
  reminder.

Done when:
- [x] Installable on Android Chrome and iOS Safari; installability checks pass
      (`apps/web/e2e/pwa.spec.ts` "the manifest makes the app installable": the manifest, PNG icons of 180, 192
      and 512 px, and Chrome's `Page.getInstallabilityErrors` returns none. Lighthouse dropped its PWA category
      in v12, so Chrome's own check stands in. iOS: `apple-touch-icon` and `apple-mobile-web-app-capable` are
      in the page head; installing on a real iPhone is part of the staging check below)
- [ ] Push arrives on an installed iPhone (iOS 16.4 or later) and on Android for each event in spec §12
      (server side verified: `apps/api/src/push.service.test.ts` sends each §12 event to the right member once,
      batches charges, skips undone ones, forgets gone subscriptions and reminds on Wednesday 19:00 local.
      Delivery to real phones needs HTTPS, so it waits for the staging deployment, as the M5 share check did;
      the owner approved this deferral on 2026-10-12)
- [x] Opening the app offline shows the shell and a clear offline message, not an error page
      (`pwa.spec.ts` "opened offline, the app shows its shell and says it is offline; back online it carries
      on", against a production build)

Notes from M6:
- Push: `push_subs` (unique endpoint; a device that changes user moves over). `POST /push/subscriptions`
  accepts only endpoints of the browser push services (FCM, Mozilla, Apple, Windows), because the API POSTs
  to them. `PushService.notify(memberId, text)` queues a `push` job; the worker sends with `web-push` (VAPID
  from `VAPID_*` in `.env`, logged instead of sent without them) and deletes subscriptions answering 404/410.
- Batching: the existing `charge-push` job (10 s after filing, cancelled by undo) now sends. Within 2 minutes
  of the accused's last charge push it re-queues itself for the end of the window; then one push carries every
  unpushed charge still pending (`charges.pushed_at`, claimed atomically).
- The reminder sweep runs every 15 minutes (`reminder` queue), so :30 and :45 zones get 19:00 on time; it
  catches up within a day and records `verdicts.reminded_at`.
- Service worker (`apps/web/public/sw.js`, no library): network first for pages and assets, the cache only as
  the offline fallback, so nothing is served stale online. API calls are never cached. The offline shell does
  not work under `next dev` (its runtime waits for the HMR socket), so `pnpm e2e` also builds and serves the
  web on :3101 for `pwa.spec.ts`. Other specs block service workers.
- The app icon is drawn at request time by `next/og` from `packages/art`'s cup crown on ink, as in the
  prototype's "App icon" (the ink outlines vanish on ink there too).
- Sound: the recipes were already in `lib/sfx.ts`; M6 adds the setting. "Sound: on/off" and
  "Notifications: on/off" pills sit on the edit screen (the app's settings) above "Leave the tab". The sound
  choice is remembered per device and shared with the story preview's mute.
- Defaults built without text or screens in the docs, all approved by the owner on 2026-10-12:
  1. Batched charge push: "Maya filed 3 charges: Trash Jenga, The Phantom Sip and 1 more."
  2. Reminder: "You still owe Maya: <sentence>." every Wednesday 19:00 local while the sentence is neither
     served nor confirmed (once served, the loser is waiting on the winner, so no reminder).
  3. Auto-guilty after 24 hours of silence sends no push ("pleads guilty" would be untrue).
  4. The one-time offer after the pair completes: "Know when you're charged" / "A ping when Alex files a
     charge or pleads, and when the verdict is in." with "Turn on notifications" and "Not now" (or "Install the
     app" where Chrome offers it). On an iPhone outside the Home Screen: "Add Petty Tab to your Home Screen"
     with the Share, Add to Home Screen steps. The offline page: "You're offline" / "The tab catches up as soon
     as you're back." with "Try again". No reference screens; built from the existing sheet and notice.
  5. Sound stays on under reduced motion (design.md §7 is about motion); the setting silences it.
- Known e2e flake, older than M6: under a full parallel run on this machine the 2-second live-update waits in
  `tab.spec.ts` and `pairing.spec.ts` time out now and then (`main` at dbec4ab: 7 failures in one run; this
  branch: 2 and 4 in two runs, different tests each time). Every spec passes when run on its own.

## M7 · Launch hardening
Status: in review (`feat/m7-launch`); defaults approved by the owner on 2026-10-12, deployment waits for a server
and domain

- Rate limits on every write endpoint, request size limits, security headers, CSRF protection for cookie auth.
- Pair deletion after 30 days; a "delete everything" button.
- Production deployment with Docker on a single small server, HTTPS, nightly Postgres backups with a tested
  restore, uptime check, error logging.

Done when:
- [ ] A restore from last night's backup into a fresh database succeeds
      (built and checked: `ops/backup.sh` dumps, restores into a scratch database and compares counts; PASS
      against the dev database, inside the local production stack, and in CI on every push. Ticks once it
      has run on the server)
- [ ] The app runs at the production domain over HTTPS with all checks green
      (rehearsed locally with `DOMAIN=localhost`: all services healthy, the headers below served, two people
      paired with the join arriving live through Caddy and Next. Needs the owner's server and domain)
- [ ] A five-minute manual test plan (in this file) passes on two real phones (below; also the M5 share and
      M6 push checks)

Runbook:
1. A server with Docker (1 vCPU, 2 GB is enough) and a DNS A record for the domain pointing at it; ports 80
   and 443 open.
2. `git clone`, then `.env` from `.env.example` with fresh secrets: `DOMAIN`, `POSTGRES_PASSWORD`,
   `INVITE_KEY` and `FILES_KEY` (`openssl rand -base64 32`), and a new VAPID pair with `VAPID_SUBJECT` set to
   a real contact.
3. `docker compose -f compose.prod.yaml up -d --build`. The API applies migrations on start; Caddy gets the
   certificate on the first request.
4. Check: `curl https://$DOMAIN/api/health` answers `{"status":"ok","db":"ok"}`; `docker compose -f
   compose.prod.yaml logs backup` shows a PASS line after the first night. Point an uptime monitor at the
   health URL.
5. Restore: `docker compose -f compose.prod.yaml exec backup sh -c 'createdb petty_restored && pg_restore
   --no-owner -d petty_restored /backups/<file>.dump'`, then point `DATABASE_URL` at it, or drop and
   recreate `petty_tab` from the dump. Renders: untar `storage-<stamp>.tgz` into the `storage` volume.
6. Update: `git pull && docker compose -f compose.prod.yaml up -d --build`.

Manual test plan (two phones, one iPhone with iOS 16.4 or later, about five minutes):
1. Phone A opens the domain, starts a tab, shares the invite to phone B over WhatsApp.
2. B opens the link, picks a name and animal. A sees B join without reloading, and gets a "joined" push.
3. Both install the app (iPhone: Share, Add to Home Screen) and turn notifications on from the offer or the
   edit screen.
4. A files a charge, undoes it inside 10 seconds: B gets nothing. A files two more: B gets one push within
   about 10 seconds, then the batch after 2 minutes.
5. B pleads guilty to one and appeals the other: A gets both pushes and upholds; B gets "upheld".
6. Airplane mode on one phone, open the app: the offline message shows; back online, it catches up.
7. After the first Sunday 20:00: both get the verdict push; the winner picks a sentence, shares the card and
   the reel to WhatsApp and Instagram Stories; the loser marks it served, the winner confirms.
8. On a throwaway pair, "Delete everything" on one phone: the other phone's tab ends.

Notes from M7:
- One middleware before the session (`guard.middleware.ts`): writes from another site are refused by
  `Sec-Fetch-Site` (the cookie is SameSite=Lax as well); 60 writes a minute per session and 30 cookieless
  requests a minute per client IP, in memory (one API process). Caddy replaces any client-sent
  X-Forwarded-For, so the IP is real; verified by a 429 from the host while a request from inside Caddy
  passed. JSON bodies are capped at 8 KB (413).
- Headers from Next: CSP (same origin only; inline scripts and styles, which Next's hydration needs),
  nosniff, `Referrer-Policy: same-origin`, a Permissions-Policy, `frame-ancestors 'none'`; HSTS from Caddy.
- Retention: a daily `purge` job deletes pairs 30 days after they ended, with their renders. "Delete
  everything" (`DELETE /me`, spec §4.8, new) deletes every pair the user was in, the user, their sessions and
  push subscriptions, and clears the cookie and the device's local settings.
- Deployment: one Dockerfile with three targets, `compose.prod.yaml` with Postgres, Caddy and the backup
  service. Renders stay on a local volume shared by the API and the renderer (no bucket on one server).
  Errors: Nest already logs unhandled errors with their stack; every service logs to stdout, rotated at
  5 × 10 MB.
- The reel determinism test failed under the now faster full e2e run: the screenshot could land before a
  layer that had just become visible was painted (the plates at 4.10 s). The renderer now waits two
  animation frames after each `seek(t)`; three full runs passed it.
- The API tests were flaky on `main` too (failures in 3 of 4 runs on a fresh database): files ran in
  parallel and the unscoped `sealDue()` and `remind()` sweeps reached other files' pairs mid-test. API test
  files now run one at a time (about 20 s); 3 of 3 runs green.
- Phone test, 2026-10-12: an iPhone reload on the tab screen showed Next's "Application error". It did not
  reproduce in WebKit or Chromium (with and without the service worker, over HTTPS, with the phones' exact
  charges and 300 ms latency). `app/error.tsx` now catches any client exception with a "Try again" reload
  and, for the phone test only, prints the error name and message. Before launch: remove that message
  (marked `ponytail:` in the file). The reel determinism test failed once more on 2026-10-13 (3 of 180
  frames differed) and passed on the rerun.
- Defaults built without text or numbers in the docs, all approved by the owner on 2026-10-12:
  1. Limits: 60 writes a minute per session, 30 new sessions a minute per IP, 8 KB bodies. The 10 charges a
     day of spec §7 stay on top.
  2. "Delete everything" deletes the shared tab at once, so the partner loses its history too (after a leave
     it is already invisible to them). Copy: "Delete everything" / "Your tabs, verdicts and this phone's
     place in Petty Tab are deleted for good. Alex's tab ends too." with "Keep it". No reference screen.
  3. Backups stay on the server for 14 days, restore-checked every night, with no offsite copy (offsite deferred
     to after launch); renders on local disk.
  4. No hosted error tracker for launch; rotated Docker logs only.

## Phone-test polish (between M7 and M8)
Status: in review (`feat/phone-ux`), asked for by the owner on 2026-10-14 after the two-phone test

- [x] Only the list scrolls; the page does not bounce on iOS; **Log a petty crime** is a footer under the list,
      so it never covers a charge (`Tab.module.css`, `globals.css`; reference screenshots 06 and 08 in the
      e2e report)
- [x] The scoreboard keeps the avatars, the rope and the lead; "Who owes what" opens the tally sheet
      (`e2e/tab.spec.ts` "A files Trash Jenga, B pleads guilty live, A sees the stamp and the score bump")
- [x] Couple banter instead of court words, on screen and in pushes (spec §8, §10, §12; design.md §5, §6, §9;
      `notify.test.ts`, `push.service.test.ts`, `e2e/tab.spec.ts`)
- [x] The filer's card says "<accused> is disputing this! What's the call?" above Nice try / Let it slide
      (`e2e/tab.spec.ts` "B cries foul, A sees the card live…")
- [x] A "?" in the header opens How it works, the three-step loop (`e2e/screens.spec.ts` "the ? opens How it
      works")
- [x] No daily filing limit; the M7 guard of 60 writes a minute stays (spec §8 and Open decision 7;
      `charges.service.test.ts` "has no daily cap", `e2e/tab.spec.ts` "there is no daily cap")
- Reference screens 06, 08–10 and 15 still show the owed pills and the floating button; those screenshot tests
  now compare the header and the score card's top row only (`BELOW_DUEL` in `e2e/screens.spec.ts`).

## M8 · Settle now and flexible deadlines
Status: in review (`feat/m8-deadlines`). Plan approved by the owner on 2026-10-14. The core feature is
**Settle now**; the second is moving the current deadline. Both need the partner's yes.

Done when:
- [x] The pair stores its current cycle (`cycle_start`, `cycle_end`); pairs from before M8 are backfilled at
      API start from their last verdict (`deadline.service.test.ts` "backfills pairs made before cycles were
      stored")
- [x] Sealing reads the stored cycle, seals, and starts the next one in the same transaction; twice is a no-op
      and a sealer that was down catches up (`push.service.test.ts` "tells the winner and the loser apart…",
      `verdicts.service.test.ts`); a charge filed after the deadline but before the sealer runs lands in the
      next cycle (`cycleAt`, `week.test.ts`; `deadline.service.test.ts` "files a charge made after the
      deadline…")
- [x] Settle now: the partner gets a push and a card; Settle now seals on the spot and both phones open the
      verdict (`deadline.service.test.ts` "seals the cycle the moment the partner says yes…",
      `e2e/deadline.spec.ts` "Maya asks to settle now, Alex agrees, and both phones open the verdict")
- [x] Moving the deadline: Deal moves the current deadline, Nope changes nothing, one proposal at a time,
      withdraw, too soon / too far, stale on accept, lapses at sealing (`deadline.service.test.ts` "moving the
      deadline", `e2e/deadline.spec.ts` "Maya moves the deadline…")
- [x] The sentence locks at the first share or 24 hours after sealing (`week.test.ts` "sentenceDeadline")
- [x] The reminder goes out once per cycle from its halfway point (`notify.test.ts` "reminderDue",
      `push.service.test.ts` "the sentence reminder")
- [x] The chip and "First verdict …" read the stored deadline (`charges.service.test.ts` "/tab")
- [x] spec §2, §10, §12, §13, §14, Open decisions 3 and 5; design.md §6 (deadline sheet, proposal card)
- The deadline sheet and the proposal card have no reference screenshot (layout approved by the owner on 2026-10-14); the e2e report attaches the card
  ("B: the settle-now card") for the owner's approval.

Defaults approved by the owner on 2026-10-14, with the deadline sheet layout: after a settle or a move the next cycle ends at the first Sunday 20:00 at least
48 hours away; moves land 1 hour to 14 days ahead; the quick picks use the device clock; "right now" is
lowercase (CLAUDE.md caps rule). Not built: recurring 3/5/7-day cycles, proposal history.

Decided by the owner on 2026-10-14:
1. An accepted change moves the **current** deadline at once (within the limits above).
2. The winner can change the sentence until their first share or 24 hours after the verdict, for every cycle
   length (replaces "Monday 20:00"; `sentenceDeadline` in `week.ts`).
3. The sentence reminder goes out at the halfway point of the cycle (replaces Wednesday 19:00;
   `reminderTime` in `week.ts`).

### Product ideas for M8 and later (for the owner to pick)
1. **Custom crimes.** The pair adds its own crimes (title, one line, a unit from the catalog, a sticker
   picked from the art package). A `custom_crimes` table per pair; charges reference a catalog key or a
   custom id. Names and titles never enter `packages/art` (CLAUDE.md); the sticker is a catalog key. Lifts
   "Custom crimes" from spec §15.
2. **Photo evidence.** An optional photo on a charge ("exhibit A: the carton"), resized in the browser and
   stored next to the renders, served through the existing short-lived signed file URLs and deleted with the
   pair's 30-day purge. Shown on the plea card only, never on the shared card or reel.
3. **Bargains.** Instead of "Fine, I did it" or "Not me!", the accused offers a deal ("I'll do the dishes
   tonight"); the filer takes it (the charge drops, with the deal shown on its row) or refuses it (back to
   pending). One new state and two actions in `transition()` in `packages/shared/src/charges.ts`.
4. **Rap sheet.** All-time stats from sealed verdicts: each person's most-charged crime, win streaks, "repeat
   offender" badges. Read-only queries over `verdicts` and `charges` (the verdict snapshots already hold
   names and counts); one new screen from the name chip.
5. **Double or nothing.** On the verdict, the loser can call a rematch: if they win the next cycle the debt is
   cancelled, if they lose the sentence doubles. One field on the verdict and a branch in the sealing step.
