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
Status: not started

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
- [ ] Each screen's screenshot test passes against its reference image, with an agreed tolerance, or each
      difference is listed and approved
- [ ] Hebrew name test: the tab and verdict render "מאיה" correctly (compare `15-` and `16-` references)
- [ ] Reduced motion: the verdict opens at its final state; no idle loops run
- [ ] Keyboard: every control reachable, focus ring visible

## M2 · Identity and pairing
Status: not started

- Anonymous session cookie (spec §3); Prisma models `users`, `sessions`, `pairs`, `members`, `invites`.
- Start a tab, invite link, join page, taken animal rule, waiting state, rename and change animal, leave pair
  (spec §4).

Done when:
- [ ] Unit tests for name validation, invite token lifecycle (expiry, single use, revoke, re-display while
      waiting) and the unique-animal rule
- [ ] Opening an invite while already in a pair shows the "You already have a tab" page and does not consume it
- [ ] E2E with two browser contexts: A starts a tab, B opens the link, picks a different animal, both see the
      completed pair within 2 seconds
- [ ] Expired, used and unknown links show the friendly page

## M3 · The tab
Status: not started

- Crime catalog in `packages/shared`; filing, undo within 10s, 24-hour filing limit; pleas and appeal
  resolution with the state machine of spec §8; auto-guilty after 24 hours (job).
- Scoring (spec §9) as pure functions; `/api/tab`; SSE `/api/events` for live updates.
- The tab screen wired to real data: scoreboard faces, rope, owed pills, plea cards, rows, log sheet, stamp
  animation on pleas.

Done when:
- [ ] Unit tests cover every transition in the plea state machine and the worked scoring examples in spec §9
- [ ] Undo is refused after a plea; undone charges do not count toward the limit; the held push is cancelled
- [ ] B appeals, A sees the appeal card live and upholds; the row shows GUILTY and the pill counts again
- [ ] E2E: A files "Trash Jenga", B sees a plea card live, pleads guilty, A sees the stamp and the pill bump
- [ ] The 11th charge in 24 hours is refused with the friendly message
- [ ] Undo inside 10 seconds removes the charge for both members

## M4 · The Sunday verdict
Status: not started

- Week windows in the pair timezone (spec §10), sealing job every 5 minutes (pg-boss), idempotent sealing,
  verdict snapshot, top crimes, seeded random sentence, sentence change window and lock, served / confirmed
  flow, unconfirmed sentence banner on the tab, tie verdict (default layout in `design.md` §6),
  `POST /verdicts/:id/shared` locking the sentence, verdict controls per role.
- Verdict screen on real data with the reveal sequence; the sentence sheet.

Done when:
- [ ] Time-travel tests with an injected clock: sealing at Sunday 20:00 in Asia/Jerusalem, America/New_York
      and Pacific/Auckland, including a DST change week
- [ ] Sealing twice produces one verdict
- [ ] Writes against a charge after its `week_end` but before sealing are refused with `week_closed`
- [ ] The winner's first share locks the sentence; the loser's share does not
- [ ] Tie, unresolved appeal and still-pending charge cases match spec §10
- [ ] The verdict screen matches `reference/screens/12-verdict-card.png` (winner's view; names winner first)
- [ ] If the owner has not approved the tie layout by then, the default is built and flagged in the summary

## M5 · Shareables
Status: not started

- `packages/reel`: the timeline from `reel.md` as data plus a React player with `seek(t)`, play, loop,
  hold-to-pause; used by the story preview screen.
- Render routes in `apps/web` for the card and the reel; `apps/renderer` worker (Playwright + ffmpeg) fed by
  pg-boss jobs; offline audio render; storage with signed URLs.
- Share button with the Web Share API (files) and a download fallback; "Send to WhatsApp".

Done when:
- [ ] The card PNG is exactly 1080×1920 and matches the verdict card layout
- [ ] Reel frames at every timestamp in `reference/reel-frames/` match within tolerance
- [ ] `ffprobe` on the MP4: 1080×1920, 30 fps, 6.00s ±1 frame, H.264 yuv420p, AAC 48 kHz
- [ ] The same verdict rendered twice produces identical frames
- [ ] Sharing works on iOS Safari and Android Chrome (manual check, recorded in this file)

## M6 · PWA and notifications
Status: not started

- Web app manifest (name, theme colours, icons from the coffee-cup crown), service worker with an offline
  shell, an install hint (with the iPhone "Add to Home Screen" steps).
- Web Push with VAPID: subscription storage, the events and texts of spec §12, batching, the Wednesday
  reminder.

Done when:
- [ ] Installable on Android Chrome and iOS Safari; Lighthouse PWA installability checks pass
- [ ] Push arrives on an installed iPhone (iOS 16.4 or later) and on Android for each event in spec §12
- [ ] Opening the app offline shows the shell and a clear offline message, not an error page

## M7 · Launch hardening
Status: not started

- Rate limits on every write endpoint, request size limits, security headers, CSRF protection for cookie auth.
- Pair deletion after 30 days; a "delete everything" button.
- Production deployment with Docker on a single small server, HTTPS, nightly Postgres backups with a tested
  restore, uptime check, error logging.

Done when:
- [ ] A restore from last night's backup into a fresh database succeeds
- [ ] The app runs at the production domain over HTTPS with all checks green
- [ ] A five-minute manual test plan (in this file) passes on two real phones
