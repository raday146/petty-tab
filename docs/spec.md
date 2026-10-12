# Petty Tab · product spec

Version 1 (web app / PWA). This document is the source of truth for product rules. Visuals are in
`design.md`, the reel in `reel.md`. Anything marked **Default** under Open decisions is a working assumption
the owner has not confirmed yet; build it as written and keep it easy to change.

## 1. The product in one paragraph

Two people share one tab. Through the week each of them logs the other's petty domestic crimes ("The Phantom
Sip", "Trash Jenga"). Every crime adds one unit of a funny currency (a coffee, a dish load, a foot rub) that
the accused owes the person who filed it. The accused can plead guilty or appeal. On Sunday evening the app
seals the week: whoever was charged more is found guilty and owes the other a sentence ("7 days of morning
coffee duty"). The verdict comes out as a 9:16 story card and a 6-second reel to share. Then a fresh week
starts at 0–0.

Audience: young couples, roommates and best friends. Tone: warm, witty, self-aware. Never mean.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Pair | The two people who share a tab. Exactly two members once complete. |
| Member | A person inside a pair: display name + spirit animal. |
| Spirit animal | One of nine species (§5). Unique within a pair. |
| Crime | A catalog entry (§6): title, description, sticker, currency unit. |
| Charge | One logged crime: filed by one member against the other. |
| Plea | The accused's answer to a charge: guilty or appeal. |
| Week | The window between two Sunday verdicts in the pair's timezone. |
| Verdict | The sealed result of a week: winner, loser, top crimes, sentence. |
| Sentence | What the loser owes the winner (§7). |

## 3. Identity and sessions

- No sign-up. On first visit the API creates an anonymous user and sets a session cookie (httpOnly, Secure,
  SameSite=Lax, 1-year expiry, refreshed on use). The session id is random and stored hashed.
- The user's display name and animal belong to their pair membership, not to the user.
- Losing the cookie (cleared browser data, new phone) loses access. v1 accepts this; see Open decisions.
- One user can be in one active pair at a time.

## 4. Pairing (invite link)

What the app opens to, by state:

| Visitor | Opens to |
| --- | --- |
| No pair | Intro → **Start a tab** → name + animal picker → pair created → invite sheet with the link |
| Pair waiting for the partner | The tab in its waiting state (step 5) |
| Complete pair | The tab |
| Opens an invite link while not in a pair | The join flow (step 3) |
| Opens an invite link while in a pair (waiting or complete) | A friendly page: "You already have a tab with <name>." with a button to it. The invite is not consumed. |
| Opens their own invite link | The waiting state, with "Send this link to your partner." |

The prototype's intro shows "Invite your partner" before any name is chosen and a link like
`pettytab.app/with/maya`; both are placeholders. The real order is name and animal first, then the invite
sheet, and the real link is `/j/<token>`.

1. Person A taps **Start a tab**, enters a name (1–12 characters after trimming, any script, inner spaces
   collapsed) and picks an animal. The API creates the pair with A as its first member and the pair timezone
   taken from A's browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
2. A gets an invite link `https://<host>/j/<token>` and shares it with the system share sheet or copies it.
   The token is 128-bit random, single-use, valid 7 days. It is stored twice: hashed (for lookup) and
   encrypted with a server key (AES-256-GCM, key from the environment) so the waiting card can show the same
   link again. A can tap **New link** at any time, which revokes the previous one; an expired link is replaced
   automatically the next time the waiting card loads.
3. Person B opens the link. If B has no session, one is created. B sees who invited them (A's name and
   animal), enters a name and picks an animal. A's animal is shown as taken with A's name and cannot be picked
   (the prototype swaps animals instead; the spec wins).
4. On accept, B joins the pair, the token is consumed, and A is notified (SSE, plus push if enabled).
5. Until B joins, A sees the tab in a waiting state: the invite card (A's sticker, "Waiting for your partner",
   the link with **Share** and **Copy**, and **New link**) replaces the scoreboard, and logging is disabled.
6. Either member can change their own name or animal later (the animal must stay unique in the pair).
7. Either member can leave. Leaving ends the pair for both; its data is kept 30 days, then deleted.
8. Either member can delete everything: every tab they were in (the partner's tab ends too) with its
   verdicts and renders, and their anonymous identity on this device, at once and for good.

Invalid, expired, revoked or used links show a friendly page with a way to start a new tab.

## 5. Spirit animals

Keys are stable identifiers; names and bios are display copy. Art comes from `packages/art`.

| Key | Name | Bio (picker card) |
| --- | --- | --- |
| `cat` | The Judgy Cat | Side-eyes everything. Out loud. |
| `bear` | The Blanket Bear | Takes 90% of the duvet. Asleep by minute 4. |
| `lion` | The “King” Lion | Royal speeches. Naps 20 hours. Screams at bugs. |
| `rabbit` | The Panic Rabbit | Starts 14 chores at once. Finishes none. |
| `turtle` | The Glacial Turtle | Needs 2.5 hours to put on shoes. |
| `sheep` | The “Innocent” Sheep | “Who, me?” The evidence says yes. |
| `raccoon` | The Midnight Raccoon | Raids the fridge at 2 AM. Crumbs in bed. |
| `capy` | The Chill Capybara | The dishes are “soaking”. Since Tuesday. |
| `pup` | The Dramatic Pup | Caught red-handed. Deploys the big eyes. |

Picker order: cat, bear, lion, rabbit, turtle, sheep, raccoon, capy, pup.

## 6. Crimes and currency

Three currency units: `coffee` (coffee / coffees), `dish` (dish load / dish loads), `foot` (foot rub /
foot rubs).

| Key | Title | Description | Sticker | Unit | In the picker |
| --- | --- | --- | --- | --- | --- |
| `sip` | The Phantom Sip | Left a carton with three drops of milk in the fridge. | `sip` | coffee | yes |
| `trash` | Trash Jenga | Piled the trash to the ceiling instead of taking the bag out. | `trash` | dish | yes |
| `dish` | Dishwasher Terrorism | Loaded the dishwasher like an abstract puzzle. | `dish` | dish | yes |
| `movie` | Asleep at Minute Four | Begged to watch it. Passed out four minutes in. | `movie` | coffee | yes |
| `burrito` | The Blanket Burrito | Rolled up in 95% of the duvet. | `burrito` | coffee | yes |
| `pan` | The Eternal Soak | The pan has been “soaking” since Tuesday. | `pan` | dish | yes |
| `clock` | Snooze Roulette | Hit snooze six times. On your side of the bed. | `clock` | coffee | yes |
| `crumbs` | Midnight Crumbs | Ate cookies in bed at 2 AM and left the evidence. | `crumbs` | coffee | yes |
| `roll` | The Cardboard Tube | Left the empty roll on the holder and walked away. | `roll` | dish | yes |
| `dj` | Car DJ Crimes | Played DJ in the car. Badly. With commentary. | `tape` | foot | yes |

The prototype's picker showed the first nine; Car DJ Crimes only appeared in its sample data. v1 lists all ten,
so both members have a way to earn foot rubs. Custom crimes are out of scope for v1.

## 7. Sentences

| Key | Sentence | Detail (shown when chosen) | Icon |
| --- | --- | --- | --- |
| `coffee7` | 7 days of morning coffee duty | Made before the winner wakes. Delivered without commentary. | `cups` |
| `netflix` | Uncontested Netflix pick | One evening. No sighing, no phone. | `remote` |
| `trash7` | 7 days of morning trash duty | Before coffee. In whatever weather the court provides. | `bag` |
| `footrub` | A 15-minute foot rub | Timed. The clock restarts if you check your phone. | `foot` |
| `breakfast` | Breakfast in bed | Hot, plated and delivered. Crumbs are your problem. | `tray` |
| `fitted` | Fitted sheet duty. Alone. | No tutorials. No crying. | `blanket` |

## 8. Charges and pleas

### Filing
- Only possible when the pair is complete. A member picks a crime from the catalog; the charge is filed against
  the other member in the current week.
- The new charge appears for the accused live over SSE straight away. Its push notification is held for 10
  seconds (and then batched, §12).
- **Undo**: the filer can undo for 10 seconds from the filing toast's **Undo** action. Undo hard-deletes the
  charge, sends `charge.deleted` over SSE so it disappears from the accused's screen, and cancels the held
  push. Undo is refused once the accused has pleaded (the toast's Undo disappears when `plea.*` arrives).
- Limit: 10 charges per filer per rolling 24 hours, counting charges that still exist (undone charges do not
  count). The 11th is refused with a friendly message: "The court needs a break" / "Ten charges in a day is
  plenty. Try again tomorrow." (approved by the owner on 2026-10-12).

### States

```
pending ──plead guilty──▶ guilty
   │
   ├──appeal──▶ appealed ──filer upholds──▶ upheld
   │                 └────filer drops───▶ dropped
   │
   └──24 h without a plea──▶ guilty (silence counts as a plea)
```

- Only the accused pleads; only the filer upholds or drops an appeal. There is no time limit on deciding an
  appeal other than the week's end (§10).
- `guilty`, `pending` and `upheld` charges count toward the score. `appealed` and `dropped` do not.
- A charge belongs to the week in which it was filed, whatever happens to it later.
- Once a charge's week has ended (its `week_end` has passed, even if the sealing job has not run yet), every
  write against it is refused with `week_closed`: no undo, plea or appeal decision.

### Who sees what

| Charge state | The accused sees | The filer sees |
| --- | --- | --- |
| `pending` | A plea card: "<filer> says you did this." with **Guilty** / **Appeal** | A row with the accused's `plain` face and the pill; no buttons |
| `appealed` | A row with their own `smug` face; "Appealed" in place of the pill | An appeal card: "<accused> appeals." with **Uphold** / **Drop** |
| `guilty`, `upheld` | A row with their `sad` face and the pill | Same row |
| `dropped` | A row with their `plain` face, the title muted, no pill | Same row |

Copy on each side never names the viewer in the third person: the accused's own card says "Maya says you did
this.", never "Alex pleads…". The prototype's plea card (reference screens 08 and 09) is drawn from the
filer's phone with the accused's buttons; treat it as the accused's card with the names swapped.

## 9. Score

For one week, each member's **points** = the number of counting charges they filed against the other member.
The scoreboard shows, for each member, what they are owed grouped by unit ("4 coffees, 2 dish loads").

- `lead = points(me) − points(partner)`. The leader is the member with more points. Lead 0 shows "Dead even".
- The rope marker sits at `50% − clamp(7 × lead, −40, 40)%` of the track width, measured from my side, so it
  moves toward whoever leads.

This rewards filing, on purpose: the app is about being petty together.

Worked examples (the unit tests must include these):

| Charges this week | Points (Maya – Alex) | Maya is owed | Alex is owed | Lead, rope from Maya's side |
| --- | --- | --- | --- | --- |
| Maya filed sip (guilty), sip (pending), trash (upheld), movie (appealed); Alex filed clock (guilty) | 3 – 1 | 2 coffees, 1 dish load | 1 coffee | +2 → 36% |
| Maya filed dish (dropped); Alex filed dj (guilty), roll (pending) | 0 – 2 | nothing | 1 foot rub, 1 dish load | −2 → 64% |
| Maya filed 7 counting charges; Alex filed 0 | 7 – 0 | … | … | +7 → 10% (offset clamped to 40) |
| Each filed 2 counting charges | 2 – 2 | … | … | 0 → 50%, "Dead even" |

## 10. The week and the Sunday verdict

- A week runs from Sunday 20:00 to the next Sunday 20:00 in the pair's timezone. The first week of a new pair
  starts when the second member joins and ends at the first Sunday 20:00 at least 48 hours later.
- The week's charges freeze at `week_end` (§8). The sealing job runs every 5 minutes, so it seals a little
  after `week_end`; nothing can change in between. For each ended, unsealed week it:
  1. Persists final statuses: `pending` becomes `guilty` and unresolved `appealed` becomes `dropped`, with
     `resolved_at` set to `week_end`.
  2. Points are computed (§9). The member with more points is the **winner**; the other is **guilty**.
  3. **Tie** (including a week with no charges): no one is guilty. The verdict is "Dead even": no sentence, a calmer card, no reel. Push to both:
     "Dead even this week. The court is impressed."
  4. Top crimes: the three crime keys with the most counting charges against the loser, ties broken by the
     most recent charge. They are stored as crime keys; when drawing, pass the catalog's sticker key (§6:
     `dj` draws as `tape`), never the crime key.
  5. A sentence is pre-selected at random (seeded by the verdict id so renders are reproducible).
  6. The verdict is stored with a snapshot of names, animals, counts and top crimes, so later renames do not
     change it.
  7. A card render and a reel render are queued (§11). Both members get a push (if enabled): the winner "Court
     is adjourned. You won the week." and the loser "The verdict is in."
- The winner can change the sentence until they first share the verdict or until Monday 20:00, whichever comes
  first. After that it is locked. "Share" means the winner tapped any share or download control on the
  verdict or story screen: the client calls `POST /verdicts/:id/shared` before opening the share sheet, which
  sets `shared_at` (first time only) and `sentence_locked_at`. The loser sharing does not lock anything.
- The loser marks the sentence as served; the winner confirms. An unconfirmed sentence shows on the tab as
  "Alex still owes Maya: 7 days of morning coffee duty" until confirmed.
- Names are always ordered **winner first**: "Maya vs. Alex" on the card and in the reel, whoever is looking.
  There is one card and one reel per verdict. On a tie, the order is the order members joined the pair.
- After sealing, the new week starts at 0–0.

### Verdict screen controls by role

| Control | Winner, before lock | Winner, after lock | Loser |
| --- | --- | --- | --- |
| Sentence (opens the sentence sheet) and dice | Shown | Hidden; sentence is plain text | Hidden; sentence is plain text |
| Share story, Send to WhatsApp, replay | Shown | Shown | Shown |
| Served | — | — | "I served it" until `served_at` is set, then "Waiting for <winner>" |
| Confirm | "Confirm it's served" once `served_at` is set | Same | — |

The tab's "Verdict on Sunday" chip opens the latest sealed verdict. Before the pair's first verdict it is not
a button; it reads "First verdict <weekday> 20:00". A new verdict does not open by itself; the chip opens it
(approved by the owner on 2026-10-12).

## 11. Sharing

- **Card**: the static verdict card at 1080×1920 PNG (layout in `design.md`, Verdict screen).
- **Reel**: a 6-second MP4 at 1080×1920 with sound (timeline in `reel.md`).
- Renders run as jobs after sealing and again when the sentence changes. Files go to object storage (local
  volume in development, any S3-compatible bucket in production) behind short-lived signed URLs.
- The share button uses the Web Share API with files when `navigator.canShare({ files })` allows it, so the
  phone's share sheet can send to Instagram Stories, TikTok, WhatsApp. Otherwise it downloads the file.
- Shared files contain both display names and animals, nothing else personal.
- The in-app story preview (the story screen in the prototype) plays the same timeline live with a story-viewer
  frame around it. The frame (progress bars, handle, mention tag, reply bar) is never part of the export.

## 12. Notifications

Web Push with VAPID keys, opt-in from a settings toggle and from a one-time prompt after the pair completes.
On iPhone this only works once the app is added to the Home Screen; the prompt says so.

| Event | To | Text |
| --- | --- | --- |
| Partner joined | inviter | "<B> joined as <animal name>." |
| New charge | accused | "<filer> filed: <crime title>." |
| Plea | filer | "<accused> pleads guilty." / "<accused> appeals: <crime title>. Your call." |
| Appeal decided | accused | "<filer> upheld it." / "<filer> dropped it." |
| Verdict sealed | both | winner / loser / tie texts in §10 |
| Sentence reminder | loser | Wednesday 19:00 local, while a sentence is unconfirmed |

Max one push per event; charges filed within 2 minutes of each other are batched into one push. A charge's
push is held 10 seconds so an undo can cancel it (§8).

## 13. Data model (logical)

```
users           id, created_at, last_seen_at
sessions        id, user_id, token_hash, created_at, expires_at
pairs           id, timezone, created_at, ended_at
members         id, pair_id, user_id, display_name, species, joined_at       unique (pair_id, species)
invites         id, pair_id, token_hash, token_enc, created_by, expires_at, used_at, revoked_at
charges         id, pair_id, week_start, filer_id, accused_id, crime_key, status,
                created_at, pleaded_at, resolved_at                          index (pair_id, week_start)
verdicts        id, pair_id, week_start, week_end, sealed_at, winner_id, loser_id, is_tie,
                snapshot jsonb, sentence_key, shared_at, sentence_locked_at, served_at, confirmed_at,
                card_url, reel_url
push_subs       id, user_id, endpoint, keys jsonb, created_at
```

`status` is one of `pending | guilty | appealed | upheld | dropped`. Deleted charges (undo) are hard-deleted.

## 14. API (REST + SSE)

All endpoints are under `/api`, use the session cookie, and return JSON. Errors use
`{ error: { code, message } }` with stable codes (at least `not_in_pair`, `pair_incomplete`, `already_in_pair`,
`invite_invalid`, `species_taken`, `rate_limited`, `undo_expired`, `already_pleaded`, `week_closed`,
`not_allowed`, `sentence_locked`, `invalid_request` for a body that fails its schema).

```
GET    /me                               session, membership, pair summary
DELETE /me                               delete everything (§4.8) and clear the session cookie
POST   /pairs                            { name, species, timezone }  → { link: "/j/<token>" }
GET    /pairs/invite                     current invite link while waiting (re-issued if expired)
POST   /pairs/invite                     new invite link (revokes old)
GET    /invites/:token                   inviter name and species (= the taken species), and `own`
                                         (the viewer created it); never consumes the link
POST   /invites/:token/accept            { name, species }
PATCH  /members/me                       { name?, species? }
DELETE /pairs/current                    leave the pair
GET    /tab                              current week: members, scores, owed by unit, charges, pending pleas,
                                         unconfirmed sentences
POST   /charges                          { crimeKey }
DELETE /charges/:id                      undo (filer, within 10 s, before any plea)
POST   /charges/:id/plea                 { plea: "guilty" | "appeal" }
POST   /charges/:id/appeal               { decision: "uphold" | "drop" }   (filer)
GET    /verdicts/latest
GET    /verdicts/:id
PATCH  /verdicts/:id/sentence            { sentenceKey }   (winner, before lock)
POST   /verdicts/:id/shared              (any member; locks the sentence when the winner calls it)
POST   /verdicts/:id/served              (loser)
POST   /verdicts/:id/confirm             (winner)
GET    /verdicts/:id/card                302 to a signed PNG URL (404 until rendered)
GET    /verdicts/:id/reel                302 to a signed MP4 URL (404 until rendered)
GET    /events                           SSE stream for the pair: charge.created, charge.deleted, plea.guilty,
                                         plea.appeal, appeal.upheld, appeal.dropped, member.joined,
                                         member.updated, member.left, verdict.sealed,
                                         verdict.updated. Each message is
                                         { type, chargeId? }; clients refetch /tab. 24 hours of silence
                                         sends plea.guilty too.
POST   /push/subscriptions               { endpoint, keys }
DELETE /push/subscriptions               { endpoint }
```

## 15. Out of scope for v1

Custom crimes, more than two people per tab, chat or comments, money of any kind, accounts with email or
OAuth, a Hebrew UI (names in Hebrew are supported), native apps, ads.

## 16. Open decisions

| # | Question | Default used until decided |
| --- | --- | --- |
| 1 | What happens to appeals still unresolved at the verdict? | Dropped (benefit of the doubt) (approved by the owner on 2026-10-12). |
| 2 | Does a pending charge become guilty on its own? | Yes, after 24 hours without a plea. |
| 3 | Verdict time | Sunday 20:00 in the pair's timezone. |
| 4 | Tie | "Dead even" card (layout in `design.md` §6), no sentence, no reel (approved by the owner on 2026-10-12). A week with no charges seals as "Dead even" too. |
| 5 | How long can the winner change the sentence? | Until first share or Monday 20:00 (approved by the owner on 2026-10-12). |
| 6 | Account recovery when the cookie is lost | None in v1. Candidate for v1.1: a recovery link the user saves, or an emailed magic link. |
| 7 | Filing limit | 10 charges per filer per rolling 24 hours. |
| 8 | Monetisation | None in v1. Earlier direction: cosmetic extras ($0.99–$4.99) such as more sentences or animal outfits. |
