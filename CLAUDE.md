# Petty Tab

A two-person web app (installable PWA) for couples, roommates and best friends. Each person picks a domestic
spirit animal, logs the other's petty crimes through the week, and every Sunday the app seals a verdict: the
loser is found guilty and owes the winner a funny sentence, shared as a 9:16 story card and a 6-second reel.

## Sources of truth

Read these before planning any work. When they disagree, the higher one wins.

1. `docs/spec.md`: product rules, data model, API. Never invent a rule; if something is missing, ask.
2. `docs/design.md`: tokens, type, components, screen-by-screen layout.
3. `docs/reel.md`: the 6-second reel timeline, frame by frame, with audio cues.
4. `reference/prototype.html`: the approved interactive prototype. Open it in a browser to see any screen.
   `reference/screens/` and `reference/reel-frames/` are the visual targets.
5. `docs/plan.md`: milestones and their "done when" checks. Update its status lines as work lands.

The prototype was built to show the look, not the rules. Where it differs from the docs (who sees the plea
card, name order, the invite flow, swapping animals), the docs win; `design.md` §6 lists the known cases.

## Stack

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspaces |
| Web | Next.js (App Router, TypeScript), Tailwind CSS, installable PWA |
| API | NestJS (TypeScript), Prisma, PostgreSQL |
| Jobs and cron | pg-boss (runs on the same Postgres, no Redis) |
| Live updates | Server-Sent Events from the API |
| Push | Web Push with VAPID keys |
| Renders | `apps/renderer`: headless Chromium (Playwright) + ffmpeg, card PNG and reel MP4 |
| Tests | Vitest (unit), Playwright (e2e and screenshot comparison) |
| Local infra | Docker Compose: postgres (api, web, renderer services arrive in M5 and M7) |

Use the current stable major of each tool at setup time and record the versions in `docs/plan.md`.

## Layout (created in milestone M0)

```
apps/web          Next.js app: screens, PWA shell, the in-app reel preview
apps/api          NestJS: REST + SSE, Prisma schema and migrations, sealing job
apps/renderer     worker: renders verdict cards (PNG) and reels (MP4) from render routes in apps/web
packages/shared   domain types, zod schemas, crime and sentence catalogs, scoring and week maths (pure)
packages/art      the character art; copied here from assets/characters in M0, never redrawn
packages/reel     the reel timeline (pure data + a React player) used by both the preview and the renderer
docs/ reference/  specs and visual targets (read-only for code changes, see below)
```

## Commands

M0 creates these scripts; keep this list accurate whenever scripts change.

```
nvm use && corepack enable pnpm   # Node 24 from .nvmrc; pnpm version from packageManager
cp .env.example .env              # before the first install: prisma generate reads DATABASE_URL
pnpm install
docker compose up -d db           # Postgres only
pnpm dev                          # web (:3000) + api (:3001) in watch mode; /api/* is proxied by web
pnpm test                         # Vitest across packages, plus the art package's node:test suite
pnpm --filter @petty-tab/web exec playwright install chromium   # once, before the first e2e run
pnpm e2e                          # Playwright end-to-end and screenshot tests (starts web on :3100)
pnpm lint && pnpm typecheck       # ESLint + Prettier check; tsc in every package
pnpm format                       # Prettier write
pnpm db:migrate                   # Prisma migrate dev
pnpm --filter @petty-tab/art generate   # rebuild static SVGs and the art gallery
pnpm --filter @petty-tab/art test       # art package tests (node:test, no dependencies)
```

## Architecture rules

- Domain logic lives in `packages/shared` as pure, unit-tested functions: scoring, week windows, verdict
  computation, plea transitions. The API calls them and the web imports them for optimistic UI. No business
  rule is implemented twice.
- The API validates every request body with zod schemas from `packages/shared`. Controllers stay thin.
- All times are stored in UTC. Each pair has an IANA timezone; week boundaries and the Sunday verdict are
  computed in that timezone. Inject a clock everywhere so tests can travel in time.
- IDs are UUIDv7. Invite tokens are 128-bit random, stored hashed.
- Identity is an anonymous device session: an httpOnly, Secure, SameSite=Lax cookie holding a random session
  id that is stored hashed. No passwords, no OAuth providers.
- The sealing job runs every 5 minutes and seals every week whose `week_end` has passed (spec §10, including
  the first-week 48-hour rule). Charges freeze at `week_end`, not when the job runs. It is idempotent:
  sealing a week twice is a no-op.
- Card and reel renders are pg-boss jobs. The renderer loads a render-only route in `apps/web`, drives the
  reel with `seek(t)` frame by frame, renders audio offline, and muxes with ffmpeg. One timeline, two outputs.
- Catalogs (crimes, sentences, species) live in code in `packages/shared` and the DB stores their keys.

## UI rules

- Characters, stickers, illustrated icons and scenes come only from `packages/art`. Never redraw, trace or
  "improve" them in JSX. Plain UI glyphs the art package does not have (back, close, dice, replay, share,
  WhatsApp, mute, heart, send, link) live in one `apps/web` icon set, 1.8px ink strokes as in the prototype. One `createArt({ idPrefix })` per rendered component, with the prefix from `useId()`, so SVG clip
  ids are unique and SSR-stable.
- Tokens are defined once as CSS variables and mapped into the Tailwind theme. No raw hex values in components.
- Rubik is the only typeface (it carries Latin and Hebrew). No serif, no italics, no monospace.
- Every user name in the UI is wrapped in `<bdi>` so Hebrew and English names sit correctly in any sentence.
  Use logical properties (`ms-`, `me-`, `text-start`) so a Hebrew UI can come later without rework.
- No eyebrow labels, no all-caps labels (the GUILTY stamp and the reel's cold open are the only caps), no
  docket numbers, no timestamps in lists, no fine print.
- Every animation has a `prefers-reduced-motion` fallback. Sounds play only after a user gesture.
- Match the reference screenshots at 390×844. Any visual difference must be deliberate and written down.

## Guardrails

Never:
- change a product rule without updating `docs/spec.md` in the same change, and say so in the summary
- decide anything listed under "Open decisions" in `docs/spec.md`; use the stated default and flag it
- add an auth provider, analytics, or any service that needs platform review or business verification
- pass user-supplied text into `packages/art` functions (names go in an `aria-label` on a wrapper, see
  `design.md` §10), or pass a crime key where a sticker key is expected
- commit secrets; `.env` files stay local and `.env.example` documents every variable
- edit anything in `reference/` or `assets/` (they are the approved originals)
- add a dependency without one line in the PR or commit message on why it is needed

Always:
- start each milestone in plan mode: restate the milestone's "done when" list, then propose the plan
- write the failing test first for domain logic (scoring, weeks, pleas, sealing)
- run `pnpm lint && pnpm typecheck && pnpm test` before calling work done, plus `pnpm e2e` for UI work
- compare UI work against `reference/screens/` with Playwright screenshots and report the differences
- keep commits small and scoped to one milestone step

## Definition of done (every task)

Tests pass, types check, the relevant "done when" items in `docs/plan.md` are ticked with evidence (test
names, screenshots), docs are updated if behaviour changed, and nothing outside the task's scope moved.
