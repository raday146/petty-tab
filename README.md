# Petty Tab

Handoff package for building Petty Tab with Claude Code: the specs, the approved prototype, and the character
art as a ready-to-use package. No application code yet; milestone M0 in `docs/plan.md` creates it.

## What is here

| Path | What it is |
| --- | --- |
| `CLAUDE.md` | Instructions Claude Code reads at the start of every session: stack, rules, guardrails |
| `docs/spec.md` | Product rules, data model, API, open decisions |
| `docs/design.md` | Colours, type, components, every screen |
| `docs/reel.md` | The 6-second verdict reel: timeline, particles, audio cues, export settings |
| `docs/plan.md` | Milestones M0–M7 with "done when" checks |
| `assets/characters/` | `@petty-tab/art`: the nine animals, stickers, icons and scenes as SVG builders, plus static SVGs and a gallery |
| `reference/prototype.html` | The approved interactive prototype (open it in a browser) |
| `reference/screens/` | Every screen and state at 390×844 (2× PNG) |
| `reference/reel-frames/` | 21 golden frames of the reel at 1080×1920 |

## Start building

```
git init && git add . && git commit -m "Petty Tab: handoff package"
claude
```

First prompt, in plan mode:

> Read CLAUDE.md and everything in docs/. Then plan milestone M0 from docs/plan.md: restate its "done when"
> list and propose the steps. Don't write code until I approve the plan.

After M0, run one milestone per session the same way. Answer the open decisions at the end of
`docs/spec.md` whenever you are ready; until then Claude Code uses the stated defaults.
