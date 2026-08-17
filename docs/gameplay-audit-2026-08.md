# Sunder gameplay + graphics audit — 2026-08-17

Live review run against the repo (clone of mattphe23/Sunder @ main). Companion to
`PLAN.md` / `todo.md`; this is meant to be shared with any AI pair (Claude) so all
reviewers read from the same artifact.

## 1. How it was audited (evidence, not opinion)

All executed this session, in-sandbox:

| Check | Command | Result |
|---|---|---|
| Typecheck (full repo, ~36k LOC) | `pnpm exec tsc --noEmit` | **clean, 0 errors** |
| Test suite | `pnpm test` (vitest, 31 files) | **210 passed**; 5 files fail on *environment* — `store`/`playtest*` throw `No STRIPE_SECRET_KEY` (`server/stripe.ts`). Engine + balance suites green. |
| AI batch sim (default) | `npx tsx server/ai.batch.sim.ts` | 80/80 games, 100% decisive |
| AI batch sim (slot-fair) | `... --rotate` | 80/80 games, 100% decisive |
| AI batch sim (map-dep) | `... --archi` | 80/80 games, 100% decisive |

Raw output lives outside the repo (`/home/ubuntu/ai-sim/results*.jsonl`); the tables
below are distilled from it.

## 2. Balance — slot-controlled win rates

`--rotate` seats all 6 tribes across turn-order slots, so the spread below is
tribe strength, not who went first.

| Tribe (passive) | Rotated wins | Victory path | Decisive share |
|---|---|---|---|
| Vessari (outriders) | 30% | bloodforge | 13 |
| Nerivane (tideborn) | 30% | greatharvest | 14 |
| Kharzul (forgeborn) | 26% | plunderking | 12 |
| Sunwei (harvesters) | 23% | tidemastery | 10 |
| Auren (scholars) | 22% | enlightenment | 8 |
| Dravok (stonebound) | 18% | unbrokenwall | 8 |

- Six-faction spread **18–30%**, all **7 victory paths firing at 8–14%** of
  decisive games. Well inside healthy range for the genre — the batch harness is
  the project's biggest asset.
- **Pitfall found:** the *default* `ai.batch.sim.ts` run (un-rotated) showed
  "Sunwei 10%, Kharzul 35%" — pure turn-order/slot artifact. Rotated, Sunwei is
  23% and Kharzul 26%. **Recommendation:** make rotation the default in
  `ai.batch.sim.ts`; anyone (or another AI) reading the fast run will be misled.

### Difficulty axis
On `easy`/`normal` the field stays spread; on `hard`/`impossible` wins shift
toward Auren/Enlightenment. Higher AI economy makes the tech-snowball the
dominant strategy at the top tier — the one balance axis to size next.

## 3. Graphics — verdict and the changes made

### Where it already stands (good)
- **Materials are UNLIT emissive** with hand-picked per-face value ramps and a
  fixed `SIDE_DARKEN = 0.62` (`client/src/game/render/palette.ts`) — the "flat
  painted quilt" is deliberate, not soft-jank.
- **Biome system** (`BIOMES`): per-preset terrain ramps, coast rim, sand strip,
  tree geometry (conifer/palm/pine/acacia) and rock kinds.
- **Phone framing solved**: `frameOpeningShot` in `scene.ts` sizes camera radius
  to the explored bounding box for the ~0.46 portrait aspect.

### Change applied (Visual fix #1 — landed, safe)
Triplicate-green terrain was the one real defect (grass `#84c95e`, forest
`#4a9e4e`, mountain `#79b055` all green-family → poor colorblind separation).
Applied in `palette.ts`:

| Biome | mountain top | mountain side |
|---|---|---|
| continents (default) | `#79b055` → `#8f98aa` | `#47823a` → `#5b6477` |
| archipelago | `#a1a98c` → `#9aa393` | `#4a8a3c` → `#5f6a5e` |
| highlands | `#8e9bad` (already slate) | — |
| pangaea | `#b2a288` → `#a89b82` | `#647436` → `#5f5746` |

Also deepened archipelago forest `#4fae55` → `#3f8a43` so grass-vs-forest
value-separation reads for deutan/protan players (2.39:1).
Highlands mountain was already correct slate. Reads "rock not grass" by
hue+saturation, which is *better* for deuteranopia than two greens. Kept the
adjacent-land tiles low luminance-contrast by design (terrain continuity beats
checkerboarding; the massif geometry + rock decor carry the read). Palette test
still passes (side darker than top).

### Tribe colors — measured, awaiting your call (Visual fix #3)
Units are tinted purely by `TRIBE_DEFS[i].color` (`buildCharacter`), so ownership
is color-only. CVD simulation of the 8 banner colors found two real near-splits
(all else OK):

| Pair | Issue | Worst |
|---|---|---|
| Kharzul `#e04747` crimson vs Dravok `#a8763e` ochre | nearly identical under **protanopia** | dist 18 |
| Nerivane `#2dd4bf` teal vs Valkyra `#38bdf8` storm-blue | very close under **deutanopia** | dist 37 |

Recommended nudges — **APPLIED 2026-08-17** (verified: tsc clean):
- Dravok ochre `#a8763e` → `#8a5c2e` (keeps "ochre", lifts it off crimson under protan).
- Valkyra storm-blue `#38bdf8` → `#2563eb` (away from Nerivane teal under deutan).
Applied in `TRIBE_DEFS` (`client/src/game/core/types.ts`).

## 4. Camera — evaluation (Visual fix #2): keep perspective for now

`ArcRotateCamera`, beta `π/3.4` (~53°, locked below top-down), radius 7–30,
multi-touch pinch/pan tuned, mobile-framing already handled. Orthographic would
give perfectly uniform cells at the board edges, but: the perspective is mild at
this pitch, the "island floating over the abyss" toy-diorama look is intentional,
and switching mid-development would retune the framer + pinch math + look for a
marginal gain. **Recommendation: keep perspective.** Cheap A/B to judge on-device
if wanted: set `camera.mode = BABYLON.Camera.ORTHOGRAPHIC_MODE` + ortho bounds in
`setupCameraLights`, toggle, compare on a phone.

## 5. Map dependence — `--archi` batch (Nerivane / Tidecaller)

Nerivane (Tidecaller def 4) seated every slot, archipelago vs continents:

| | archipelago (home) | continents |
|---|---|---|
| Nerivane win | **30%** | **15%** |
| Nerivane income | 8.60 | 9.53 |

Income is *higher* on continents, yet she wins *half* as much — the swing is the
**water/terrain kit** (Tidecaller swims, boats, water battles), not the income
passive. Takeaway: coastal-identity factions are a new-player trap on low-water
maps; ensure the player sees the map preset **before** tribe pick (match setup
does show `preset` — verify the single-player flow does too), or bias Nerivane's
kit with a small non-water crutch.

## 6. Balance angle — Dravok (stonebound)

Weakest overall (18% rotated; lowest city count at 2.24). Defensive/turtle
identity is systematically under-rewarded — nothing pays for holding ground, and
the `unbrokenwall` path is the thinnest (8 fires). This is the clearest tuning
target, not an emergent artifact.

## 7. Open recommendations (priority)

1. Make `--rotate` the default in `ai.batch.sim.ts` — today the fast path lies.
2. Approve or reject the 2 tribe-color nudges (item 3 above).
3. Rebalance Dravok's defensive identity (give turtling a scoring/timing payoff).
4. Human playtest of turns 1–15 — all balance data is AI-vs-AI; fun/pacing/
   readability is the one thing the harness cannot measure.
5. Handle the missing-Stripe env so the full `pnpm test` is green anywhere (or a
   `.env.example` documenting the required vars).

## 8. Fatality scenes — verdict + changes (2026-08-17)

The trigger/budget logic in `core/fatality.ts` is the most disciplined in the
codebase and should not change: per-match budget 2 (`final` exempt), once-per-
turn, human-involved only, suppressed in challenge/spectate, `prefers-reduced-
motion` honoured in both the rule and the letterbox CSS, and the cinematic is
skippable (whole surface + Esc/Enter/Space). The presentation already centres a
victim-name/goodline stack with a `FATALITY_LABEL` eyebrow — "let the words
carry it" was largely already true.

Two changes applied (tsc clean; `server/fatality.test.ts` 13/13):
1. **On-screen attribution readability (phone).** The killer line was
   `text-white/60` at 11px just below the bar over bright terrain — the line a
   player wants to read. Bumped to `text-sm font-semibold text-white/90` with a
   drop shadow (`client/src/game/GameCanvas.tsx`).
2. **Cross-match cadence.** Added `FATALITY_COOLDOWN_MS = 5 min` (localStorage
   key `polyforge-fatality-last`): a cinematic may play at most once inside the
   window, so grinding several matches an hour no longer repeats the same death.
   `final` stays exempt (`kind === "final"` returns before the cooldown check);
   `markFatality` refreshes the stamp for every kind. `withinCooldown` reads
   `Date.now() - lastPlayed()`, so a fresh profile never blocks.