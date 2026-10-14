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
| Week | The window between two verdicts (a cycle). By default Sunday 20:00 to Sunday 20:00 in the pair's timezone; the pair can settle early or move the deadline together (§10). |
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
| No pair | Intro → **Start a tab** → 1 name + animal picker → 2 **Set the rules** → pair created → 3 invite sheet with the link and the rules (M10) |
| Pair waiting for the partner | The tab in its waiting state (step 5) |
| Complete pair | The tab |
| Opens an invite link while not in a pair | The join flow (step 3): the inviter's rules first, then the picker |
| Opens an invite link while in a pair (waiting or complete) | A friendly page: "You already have a tab with <name>." with a button to it. The invite is not consumed. |
| Opens their own invite link | The waiting state, with "Send this link to your partner." |

The prototype's intro shows "Invite your partner" before any name is chosen and a link like
`pettytab.app/with/maya`; both are placeholders. The real order is name and animal first, then the invite
sheet, and the real link is `/j/<token>`.

1. Person A taps **Start a tab**, enters a name (1–12 characters after trimming, any script, inner spaces
   collapsed) and picks an animal. The API creates the pair with A as its first member and the pair timezone
   taken from A's browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
   **Set the rules (M10, decided by the owner on 2026-10-15).** Before the pair is created, A sets the game:
   - the round: **Weekly** (Sunday 20:00, the default), **3-day sprint** or **5-day battle** (§10);
   - an optional first verdict, an hour to 14 days ahead;
   - which catalog crimes are in play (all by default; at least one crime in total);
   - crimes of the pair's own and daily chores (§6, §8); a chore can be A's or "my partner's", which becomes
     the joiner's when they join.
   Older clients that send no rules get the defaults. The rules show on the invite sheet and the join page.
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
so both members have a way to earn foot rubs.

### The pair's own crimes (M9, decided by the owner on 2026-10-14)
- Either member can add a crime of the pair's own: a title (1–40 characters), one line (up to 80), a unit
  the creator picks (coffee, dish load or foot rub) and a sticker from the ten art stickers. It is shared by
  both and listed first in the picker. Up to 30 at a time (`too_many_crimes`).
- Either member can remove one. It leaves the picker, but charges and verdicts that used it keep its title.
  There is no editing; remove it and add it again.
- Charges store it as `custom:<id>`. It files, pleads, scores and seals exactly like a catalog crime. A
  verdict's top crimes keep a custom crime's title and sticker as sealed, so removing it later changes nothing.
- The title is user text: it is shown and rendered as text and never passed to `packages/art`; the sticker
  is drawn from its key.

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

### Daily chores (M9, decided by the owner on 2026-10-14)
- A crime of the pair's own can be a daily chore for one member (the creator or the partner). Only that member
  ticks it **done** for today, in the pair's timezone, and can untick it until midnight.
- A chore day that ends unticked at local midnight files one charge for that chore, from the partner against
  the owner, timed at midnight, in the week that day ended in. It then works like any charge: the owner can
  own it or dispute it, and the partner decides. The owner gets "Dishes duty didn't happen yesterday. It's on
  the tab." instead of the usual charge push.
- The day the chore was created is never charged. A removed chore stops charging. The sweep runs every 15
  minutes and catches up on the last two days; a day is charged at most once.

### Filing
- Only possible when the pair is complete. A member picks a crime from the catalog; the charge is filed against
  the other member in the current week.
- The new charge appears for the accused live over SSE straight away. Its push notification is held for 10
  seconds (and then batched, §12).
- **Undo**: the filer can undo for 10 seconds from the filing toast's **Undo** action. Undo hard-deletes the
  charge, sends `charge.deleted` over SSE so it disappears from the accused's screen, and cancels the held
  push. Undo is refused once the accused has pleaded (the toast's Undo disappears when `plea.*` arrives).
- No daily limit (the owner removed the 10-a-day cap on 2026-10-14 after the phone test). The general write
  limit of M7 (60 writes a minute per session) still applies; a refused filing shows "Easy, tiger" / "That's a
  lot of crimes for one minute. Try again in a moment."

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
| `pending` | A plea card: "<filer> says you did this." with **Fine, I did it** (guilty) / **Not me!** (appeal) | A row with the accused's `plain` face and the pill; no buttons |
| `appealed` | A row with their own `smug` face; "Disputed" in place of the pill | A card: "<accused> is disputing this! What's the call?" above **Nice try** (uphold) / **Let it slide** (drop) |
| `guilty`, `upheld` | A row with their `sad` face and the pill | Same row |
| `dropped` | A row with their `plain` face, the title muted, no pill | Same row |

The UI speaks in couple banter, not court language (owner, 2026-10-14): the states keep their names in the
data and the API, but screens and pushes say "cries foul", "Disputed", "Nice try", "Let it slide". The
screen-reader status reads pending, guilty, disputed, counts (upheld) or let slide (dropped). Copy on each
side never names the viewer in the third person: the accused's own card says "Maya says you did
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

## 10. The week and the verdict

- The pair stores its current week (`cycle_start`, `cycle_end`). The first week of a new pair starts when the
  second member joins. By the pair's round (§4, `cycle_days`):
  - **Weekly** (null): every week, the first included, ends at the first Sunday 20:00 in the pair's timezone
    at least 48 hours after it starts, so after a Sunday verdict the next week is Sunday to Sunday.
  - **Every 3 or 5 days**: a round ends at 20:00 local on the Nth local day after it starts, and the next one
    runs N more days (decided by the owner on 2026-10-15).
  - The creator's first verdict, if picked, ends the first round when it is still an hour or more away at the
    join; otherwise the round's rule applies. Joining is accepting the rules; there is no counter-offer.
- **Settle now.** Either member can propose to settle now. The partner sees "Maya wants to settle the tab right
  now! Ready to face the verdict?" with **Settle now** / **Not yet**, and gets a push with the same words. On
  **Settle now** the week ends at that moment and seals on the spot, by the same rules as below; both phones
  open the verdict (the only verdict that opens by itself). On **Not yet** the proposer gets "Alex says not
  yet."
- **Moving the deadline.** Either member can propose a new end for the current week, at least an hour and at
  most 14 days ahead (quick picks: tonight 21:00, in 3 days, in 5 days, or any time). The partner sees "Maya is
  moving the goalposts! Verdict Fri 21:00 instead of Sun 20:00." with **Deal** / **Nope**, and a push. **Deal**
  moves the current week's end at once (decided by the owner on 2026-10-14) and the proposer gets "Alex
  agreed. Verdict Fri 21:00."; **Nope** sends "Alex says nope." A proposal accepted when its time is less than
  an hour away is refused and dropped. The week after it ends by the default rule.
- Nothing about the deadline changes without the partner's yes. One open proposal per pair; the proposer can
  take it back; an open proposal lapses when its week seals.
- The week's charges freeze at `week_end` (§8). The sealing job runs every 5 minutes, so it seals a little
  after `week_end`; nothing can change in between. For each ended, unsealed week it:
  1. Persists final statuses: `pending` becomes `guilty` and unresolved `appealed` becomes `dropped`, with
     `resolved_at` set to `week_end`.
  2. Points are computed (§9). The member with more points is the **winner**; the other is **guilty**.
  3. **Tie** (including a week with no charges): no one is guilty. The verdict is "Dead even": no sentence, a calmer card, no reel. Push to both:
     "Dead even this week. Suspiciously wholesome."
  4. Top crimes: the three crime keys with the most counting charges against the loser, ties broken by the
     most recent charge. They are stored as crime keys; when drawing, pass the catalog's sticker key (§6:
     `dj` draws as `tape`), never the crime key.
  5. A sentence is pre-selected at random (seeded by the verdict id so renders are reproducible).
  6. The verdict is stored with a snapshot of names, animals, counts and top crimes, so later renames do not
     change it.
  7. A card render and a reel render are queued (§11). Both members get a push (if enabled): the winner "You won
     the week. Gloat responsibly." and the loser "The verdict is in."
- The winner can change the sentence until they first share the verdict or for 24 hours after it is sealed,
  whichever comes first (decided by the owner on 2026-10-14; it was Monday 20:00). After that it is locked. "Share" means the winner tapped any share or download control on the
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

The tab's chip names the deadline's weekday, "Verdict on Sunday"; before the pair's first verdict it reads
"First verdict <weekday> <time>". It opens the deadline sheet: the exact time, **Settle now**, the moves, and
"See the last verdict" once there is one. A verdict sealed at the deadline does not open by itself (approved by
the owner on 2026-10-12); a settled one does.

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
| Plea | filer | "<accused> owned it." / "<accused> cries foul: <crime title>. Your call." |
| Appeal decided | accused | "<filer> says nice try. It counts." / "<filer> let it slide." |
| Verdict sealed | both | winner / loser / tie texts in §10 |
| Sentence reminder | loser | Once per week, at its halfway point, while a sentence is unconfirmed (decided by the owner on 2026-10-14; it was Wednesday 19:00) |
| Settle now or a move proposed | partner | "Maya wants to settle the tab right now! Ready to face the verdict?" / "Maya is moving the goalposts: verdict Fri 21:00. Deal?" |
| Proposal answered | proposer | "Alex agreed. Verdict Fri 21:00." / "Alex says nope." / "Alex says not yet." |
| Chore day missed | chore owner | "<chore title> didn't happen yesterday. It's on the tab." |

Max one push per event; charges filed within 2 minutes of each other are batched into one push. A charge's
push is held 10 seconds so an undo can cancel it (§8).

## 13. Data model (logical)

```
users           id, created_at, last_seen_at
sessions        id, user_id, token_hash, created_at, expires_at
pairs           id, timezone, created_at, ended_at, cycle_start, cycle_end, cycle_days, first_end, crimes_off,
                proposal_by, proposal_end, proposal_at                       index (cycle_end)
members         id, pair_id, user_id, display_name, species, joined_at       unique (pair_id, species)
invites         id, pair_id, token_hash, token_enc, created_by, expires_at, used_at, revoked_at
charges         id, pair_id, week_start, filer_id, accused_id, crime_key, status,
                created_at, pleaded_at, resolved_at                          index (pair_id, week_start)
verdicts        id, pair_id, week_start, week_end, sealed_at, winner_id, loser_id, is_tie,
                snapshot jsonb, sentence_key, shared_at, sentence_locked_at, served_at, confirmed_at,
                card_url, reel_url
custom_crimes   id, pair_id, created_by, title, description, sticker, unit, chore_owner_id, chore_for_joiner,
                created_at,
                removed_at                                                   index (pair_id)
chore_days      crime_id, day (local date), done_at, charge_id               key (crime_id, day)
push_subs       id, user_id, endpoint, keys jsonb, created_at
```

`status` is one of `pending | guilty | appealed | upheld | dropped`. Deleted charges (undo) are hard-deleted.

## 14. API (REST + SSE)

All endpoints are under `/api`, use the session cookie, and return JSON. Errors use
`{ error: { code, message } }` with stable codes (at least `not_in_pair`, `pair_incomplete`, `already_in_pair`,
`invite_invalid`, `species_taken`, `rate_limited`, `undo_expired`, `already_pleaded`, `week_closed`,
`not_allowed`, `sentence_locked`, `proposal_open`, `no_proposal`, `too_soon`, `too_far`, `too_many_crimes`,
`invalid_request`
for a body that fails its schema).

```
GET    /me                               session, membership, pair summary
DELETE /me                               delete everything (§4.8) and clear the session cookie
POST   /pairs                            { name, species, timezone, rules? }  → { link: "/j/<token>" }
                                         rules: { cycleDays: 3 | 5 | null, firstEnd, crimesOff, custom }
GET    /pairs/invite                     current invite link while waiting (re-issued if expired)
POST   /pairs/invite                     new invite link (revokes old)
GET    /invites/:token                   inviter name and species (= the taken species), the rules, and `own`
                                         (the viewer created it); never consumes the link
POST   /invites/:token/accept            { name, species }
PATCH  /members/me                       { name?, species? }
DELETE /pairs/current                    leave the pair
GET    /tab                              current week: members, scores, owed by unit, charges, pending pleas,
                                         unconfirmed sentences, the deadline and any open proposal
GET    /breakdown                        the Breakdown: this week by crime, chores, past verdicts, all-time
POST   /charges                          { crimeKey }   (a catalog key or custom:<id>)
POST   /crimes                           { title, description, unit, sticker, chore: "me" | "them" | null }
DELETE /crimes/:id                       remove one of the pair's own crimes
POST   /chores/:id/done                  tick today (the chore's owner)
DELETE /chores/:id/done                  untick today (until midnight)
DELETE /charges/:id                      undo (filer, within 10 s, before any plea)
POST   /charges/:id/plea                 { plea: "guilty" | "appeal" }
POST   /charges/:id/appeal               { decision: "uphold" | "drop" }   (filer)
POST   /deadline/proposal                { end: ISO time | null }   (null: settle now)
POST   /deadline/proposal/accept         (the partner; settle now seals on the spot)
POST   /deadline/proposal/decline        (the partner)
DELETE /deadline/proposal                (the proposer takes it back)
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
                                         verdict.settled (opens the verdict), verdict.updated,
                                         deadline.proposed, deadline.decided,
                                         crimes.updated, chore.updated. Each message is
                                         { type, chargeId? }; clients refetch /tab. 24 hours of silence
                                         sends plea.guilty too.
POST   /push/subscriptions               { endpoint, keys }
DELETE /push/subscriptions               { endpoint }
```

## 15. Out of scope for v1

More than two people per tab, chat or comments, money of any kind, accounts with email or
OAuth, a Hebrew UI (names in Hebrew are supported), native apps, ads.

## 16. Open decisions

| # | Question | Default used until decided |
| --- | --- | --- |
| 1 | What happens to appeals still unresolved at the verdict? | Dropped (benefit of the doubt) (approved by the owner on 2026-10-12). |
| 2 | Does a pending charge become guilty on its own? | Yes, after 24 hours without a plea. |
| 3 | Verdict time | Weekly on Sunday 20:00 by default, or every 3 or 5 days at 20:00, chosen at setup (decided by the owner on 2026-10-15); the pair can settle now or move the current deadline together (2026-10-14). |
| 4 | Tie | "Dead even" card (layout in `design.md` §6), no sentence, no reel (approved by the owner on 2026-10-12). A week with no charges seals as "Dead even" too. |
| 5 | How long can the winner change the sentence? | Until first share or 24 hours after the verdict (decided by the owner on 2026-10-14). |
| 6 | Account recovery when the cookie is lost | None in v1. Candidate for v1.1: a recovery link the user saves, or an emailed magic link. |
| 7 | Filing limit | None (decided by the owner on 2026-10-14); only the 60 writes a minute guard of M7. |
| 8 | Monetisation | None in v1. Earlier direction: cosmetic extras ($0.99–$4.99) such as more sentences or animal outfits. |
