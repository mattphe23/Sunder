# Sunder: The Living Forge — Project TODO

History note: v10–v13 granular plans (all verified complete) are preserved in git history of this
file. This version consolidates the audit done after the v19 checkpoint (7d70bcb0): every item
below was checked against the actual codebase before being marked.

# v47 — Gameplay audit, App Store readiness, and the board at play distance

## Batch harness: the data was wrong before any of this
- [x] All-AI boards deadlocked on turn 0 — `addPopulation` queued the city level-up modal by
      comparing to the humanTribe INDEX (also a real hotseat bug: player 2's cities were handed
      an AI-picked reward), and `checkDominationWin` ended the match instantly when no seat was
      flagged human. Harness now asks for `humanTribe: -1` and reports stalls instead of scoring
      them as draws. Batch went from 6.67 avg turns / 29% decisive (garbage) to 22.6 / 100%.
- [x] Two turn-flow bugs could hang a real match (~0.6% of games): skipping an eliminated tribe
      re-entered nextTribe from inside beginTurn so the scheduler read the wrong tribe, and a
      tribe can be eliminated inside its OWN beginTurn because the world phase runs there.
      Round-start hooks are now keyed to the round, not to "is this the tribe in slot 0".

## Do the additions to the Polytopia formula earn their place?
- [x] Victory paths were decorative — Auren won 67% via Enlightenment, Vessari's path fired in 1%.
      Root cause was not Auren: EVERY tribe finished on 13.0/15 techs because the tree is
      exhaustible in 30 turns, so "research everything" was a free clock and all factions
      converged on the same army. Tech cost now escalates with techs owned (~11/15 now).
- [x] Plunder King now counts stars LOOTED, not stars held — banking is anti-tempo by
      construction, and the AI made it worse by halting all harvesting past 55% of target.
- [x] Bloodforge 18 → 22 battles, Great Harvest 12 → 15 city levels. Every constant swept over
      the harness and confirmed on independent seed blocks (one candidate scored best in-sample
      and worst out-of-sample). Win-rate spread 84 → 32; all seven paths now fire 7–21%.
- [x] Betrayal was unreachable code: peace hard-filtered treaty partners from targeting, so no
      treaty could ever be broken and nothing ever called `addGrudge` (0.00 across 240 games).
      Treaties can now be broken as a deliberate, warned act; grudges 0.00 → 1.52/game.
- [x] The Commander died before the hero system could happen — 14hp/2def made it squishier than
      a 3-star Defender despite being irreplaceable. 82% fell and perks fired for 1 commander in
      17. Now 20hp/4def: 32% fall, 0.50 perks each, tribe balance unchanged.
- [x] "Impossible" was the WEAKEST AI, losing 40/60 head-to-head to "hard". It rallied task
      forces in front of empty neutral villages, vetoed capturing cities it stood on, and trained
      units last after research/buildings/ports/roads/walls drained the treasury. Now wins 61/39.
- [x] The road trade network was inert — 0.02 cities per tribe earned the trade star. Greedy
      L-walk routing abandoned at the first obstacle, one tile paved per turn, and the tech
      arrived turn 21 of 25. Real BFS routing + pave-to-budget + value Roads by cities to link.
      0.02 → 0.32 connected, 3.06 → 12.28 road tiles/game.
- [x] RESOLVED below: Vessari's Raider perk and Tide Mastery's fixed target.

## The board at play distance
- [x] Opening frame: the camera aimed at the capital, which spawns near an edge often enough that
      the island fell into a corner with ~40% dead background. Now pulls partway to board centre,
      and pulls in as the viewport narrows.
- [x] Sky: Babylon clears transparent and the void is a CSS gradient (indigo, ember horizon) —
      same palette as the menu backdrop, zero draw calls, no texture memory.
- [x] Units were ~1/5 of a tile — terrain dominated and all five classes read as the same
      silhouette at play distance. Now 34% larger. The Model Lab (one figure, large, dark ground)
      is a necessary acceptance test and NOT a sufficient one.
- [x] Fixed a real bug found doing that: the move animation's squash-and-stretch keys are
      absolute scaling values and every unit animates once on spawn, so it silently reset every
      figure to unscaled size.
- [x] Contact shadows: one shared unlit disc per figure. Nothing in an unlit flat-shaded scene
      casts anything, so units hovered over their tile.
- [x] The plinth read as carved stone on the Lab's dark ground and as a bright halo on grass,
      detaching every unit. Darkened to read as the figure's own shadow-side footing.

## iOS wrapper readiness (App Store target)
- [x] viewport-fit=cover + four safe-area utilities built on env()/max() — inert everywhere
      without insets. The turn readout sat under the Dynamic Island and the controls under the
      home indicator, where iOS eats the swipe.
- [x] End Turn was pushed clean off the right edge in portrait; control rows now shrink and
      collapse labels to icons on narrow screens while End Turn keeps full width.
- [x] Minimap was pinned at a hardcoded top offset that assumed no notch (landed on the mute
      button); Map and mute were 34–36pt against Apple's 44pt minimum. Verified 393x852: no tap
      target under 44pt, nothing clipped.
- [x] RESOLVED below: Capacitor project scaffolded.

## Follow-ups resolved after the first pass
- [x] Vessari's Raider perk now pays a flat 2★ — what the victim cannot cover is minted as
      battlefield spoils. It used to pay min(2, victim.stars) and rivals are broke often enough
      that the card lied in over a third of its kills, silently (the log sat inside `if (loot > 0)`).
      Plunder King moved back up 6 → 8. Vessari 21% → 28% win, path fires 12% → 21%.
- [x] Tide Mastery scales to the board's coast (clamp 2..4, counted from shallow tiles, divisor
      swept over 4/5/7/9 on three blocks). A flat 4 made it archipelago-only: Nerivane reached
      four ports in 53% of archipelago games but 3–8% elsewhere, finishing with ZERO legal port
      sites left on three of four presets. Nerivane 15% → 23%, path fires 11% → 21%.
- [x] Capacitor iOS project scaffolded (capacitor.config.ts + ios/, `pnpm ios:sync` / `ios:open`).
      Icon and splash generated from the procedural brand sigil by `pnpm icons`, so the home
      screen cannot drift from the in-app mark. See ios/README.md for the pre-submission
      checklist — the remaining items need real devices and a Mac with Xcode.
- [x] Draw calls: tile decor merged per tile per material — 1785 meshes → 1189 on a fully
      explored 13×13. Per-tile (not per-board) so decor keeps its tile coordinates and clicking
      a tree still selects the tile under it.
- [ ] OPEN: ~759 fog-washed meshes remain, mostly tiles whose decor has no two pieces sharing a
      material. Cutting further means merging across tiles, which costs exact picking.
- [ ] OPEN: never profiled on real mobile silicon — SwiftShader frame times say nothing about a phone.

## v48 — the difficulty ladder
- [x] CORRECTION: v47's "impossible now wins 61/39" was wrong. The duel harness retargeted the
      global difficulty only when a queued turn ran, but income is paid inside beginTurn, which
      fires at the TAIL of the previous seat's turn — so every seat drew the other brain's bonus
      and the pro brain got a ~50-star head start. Correctly measured it loses 42/59. The
      published gameplay-audit artifact has been revised.
- [x] scripts/ai-ladder.mts seats all four tiers in one match and rotates the mapping. (First
      version keyed tier and roster to the same counter, locking each tier to a fixed subset of
      tribes — decorrelated before any of it was trusted.)
- [x] Measured: easy 20% / normal 23% / hard 35% / impossible 23%. The top tier sat level with
      Normal and held 2.2 cities to everyone else's ~2.6.
- [x] Fixed one real cause in the pro brain: it funnelled every unit at a single shared war
      target, so it claimed undefended villages one at a time while the standard brain took them
      in parallel. Undefended cities are now grabbed by whoever is nearest. Cities 1.6 → 2.2.
- [x] Not enough, and income does not rescue it: at MORE income than hard receives the pro brain
      only reaches parity. DECISION (user): retire it. Impossible now runs the standard brain at
      +3 income. aiPro.ts is parked with a header explaining the diagnosis.
- [x] Ladder is now monotonic: 14% / 23% / 27% / 36%, a 22-point spread. Regression tests pin
      the bonus ordering and that no tier ever pays the bonus to the human.
- [x] Achievement text no longer claims "no cheats, no mercy" — it did not survive contact.
- [ ] FUTURE PROJECT: rebuild the specialised brain the other way round — keep the standard
      brain's expansion behaviour and layer aiPro's threat map, retreat rule and hero-risk model
      on top, rather than bolting expansion onto aiPro's task-force doctrine.

## Reports
- [x] Gameplay audit published as an artifact (320-game batch, before/after per system)
- [x] Monetization thesis published as an artifact — free download, single $6.99 unlock,
      cosmetics only; do NOT sell tribes individually into a ranked pool this small

# v10 — Faction-unique units (637e6d81)
- [x] 4 unique units (Arcanist/Berserker/Warden/Raider) — rules, AI, meshes, badges, verified

# v11 — Faction intro cards (ce763395)
- [x] Lore/strategy intro overlay per faction, once per game, persisted — verified

# v12 — Sound + hot-seat + achievements (19a30984)
- [x] 11 synth SFX + menu music + mute toggle; pass-and-play 2–4 humans w/ handoff; 8 achievements

# v13 — Save slots + battle forecast + mobile (a5b38ca1)
- [x] 3 named save slots, modifier chips in attack preview, 44px+ tap targets + pinch tuning

# v14 — Diplomacy + replay + challenges + new tribes + Tribe Forge (1c16cf58)
- [x] Relations matrix (war/peace), peace treaties, tribute demands, one action per rival per turn
- [x] AI acceptance model on strength ratio; AI counter-offers; AI proposes peace when losing
- [x] Peace enforced in rules + AI target filters
- [x] Diplomacy panel UI + incoming AI offer modal + SFX (Diplomacy.tsx, diplomacy.ts)
- [x] AI↔AI coalition truces vs the score leader (coalition seed in ai.ts)
- [x] Gift stars action (clears grudge, biases next acceptance)
- [x] Replay viewer: compact event log recorded, GameOver "Watch replay" step-through (Replay.tsx)
- [x] Event log capped to protect save size
- [x] Daily challenge: date-seeded RNG, deterministic mapgen, one counted attempt/day
- [x] Weekly challenge: ISO-week seed, best-of-week score kept, Hall of Conquest entries
- [x] Tribe 5 Nerivane (Tidal Teal, tideborn passive, Tidecaller unique)
- [x] Tribe 6 Dravok (Ochre, stonebound passive, Bulwark unique) — replaced planned "Ordovai"
- [x] 6-tribe integration everywhere (mapgen, menus, hot-seat, intros, scene colors, AI)
- [x] Tribe Forge: name/color/passive/unique/tech picker, persisted custom tribe as extra pick
- [x] Verified in browser; checkpoint v14 delivered

# v15 — Graphics pass (db108d72)
- [x] Bloom/FXAA/ACES pipeline, soft shadows, water shimmer, hop/squash-stretch, hit flash,
      heal sparkles, adaptive quality on software renderers — verified

# Rebrand — Sunder: The Living Forge (fc260b73)
- [x] Logo, favicon, wordmark, Shatterlands copy pass, storage keys untouched

# Brand adoption — approved brand sheet (028e85e5)
- [x] Mountain-anvil logo mark (menu + favicon) — /manus-storage/sunder-mark_d1dbf156.png
- [x] Chiseled SUNDER wordmark image replacing font H1 — sunder-wordmark_36e4517b.png
- [x] "BUILD. CONQUER. REFORGE." tri-color tagline above Shatterlands subtitle
- [x] Verified in browser; checkpointed

# v16 — Heroes + shareable challenges (28cdfa66)
- [x] Unit.hero/xp/level/perks types; HeroPerk defs; pendingPerk modal flow
- [x] Hero spawns with capital; XP on wins/captures/ruins; level thresholds; permanent death
- [x] Perk modifiers wired into combat/movement/defense rules (incl. aura perks)
- [x] AI auto-picks a seeded perk on level-up
- [x] Distinct hero mesh (banner/crown accent) + level-up burst FX
- [x] Hero panel with level/XP bar/perks; PerkChoice modal (faction-colored)
- [x] challenges.ts encode/decode friend challenge links (?c= base64url) + validation
- [x] "Challenge a friend" copy-link button; ?c= landing banner with score to beat
- [x] Score comparison vs challenger at game end
- [x] OG share image (1200×630) + og:/twitter: meta tags
- [x] Loading splash with brand mark while Babylon initializes
- [x] pnpm check clean; browser verified; checkpoint delivered

# v17 — Living map + hero drama + profile (c9eca2b1)
- [x] Barbarian camps spawn/grow/raid (events.ts runWorldPhase); clearing grants stars
- [x] Sea storms block water movement temporarily (inStorm guards + overlay visuals)
- [x] Dormant guardians awaken mid-game near great ruins and roam
- [x] World-event notification cards + log ticker entries (WorldEvents.tsx)
- [x] Camps, storm overlays, guardian visuals rendered in Babylon scene (syncWorld)
- [x] Hero death drama card with −40 score stake + rival taunt
- [x] Player profile: persistent name + lifetime stats (profile.ts)
- [x] Commander's Record panel in menu; share reuses profile name
- [x] Verified in browser; type-check clean; checkpoint delivered

# v18 — Online multiplayer (ba8b5d19)
- [x] Full-stack upgrade (Express + tRPC + MySQL + Manus OAuth); skills read before design
- [x] Solo game regression clean after upgrade
- [x] Cloud profile sync (merge local Commander's Record with server)
- [x] DB schema: users, profiles, matches, match_turns
- [x] Async engine: create → invite link → join → validated turn submission → polling
- [x] Online Duels panel (sign-in, create/join, My Matches w/ your-turn badges) + waiting overlay
- [x] Authoritative state decision: serialized GameState snapshot per turn
- [x] Guardian's Relic bounty (extra perk slot for slaying awakened guardian)
- [x] Camp escalation warning: pulsing red minimap ring at strength 3
- [x] Two-account end-to-end match verified; vitest match coverage; checkpoint delivered

# v19 — Polish batch + turn alerts + global leaderboard (7d70bcb0)
- [x] Wordle-style "Copy result" share card on daily/weekly game-over (+ challenge URL)
- [x] Tribe Forge preset gallery: 4 remixable themed templates
- [x] Faction lore hovers on all 6 tribe cards + forge card
- [x] In-app turn notifications (poll-based toasts + tab title flash + sfx)
- [x] Global daily/weekly leaderboard: DB table + tRPC routes + panel with my rank
- [x] Vitest coverage for leaderboard routes; browser verified; checkpoint delivered

# v20 BUILD PLAN (active) — Asymmetric victories + smarter AI hero play
- [x] Gap fix: result-card copy now appends a real friend-challenge URL (?c=...) built from the
      run's seed/preset/size/score (falls back to plain site URL for custom-forge tribes)
- [x] Browser-verify all v19 flows end-to-end (copy result text incl. ?c= link, lore hovers,
      forge preset remix, turn alerts poll, leaderboard panel) — menu renders clean, tests green
- [x] Two-account online duel end-to-end re-check — covered by server-contract tests in
      match.test.ts (create → join → alternating submitTurn with server-side turn validation →
      finish records winner; plus full-match guard, stranger read guard, abandon/concede).
      True two-browser E2E requires two real Manus accounts; server API is the testable surface.
- [x] Asymmetric win conditions: per-faction victory path alongside domination/score
      (victory.ts — 7 paths: Enlightenment/Bloodforge/Great Harvest/Plunder King/Tide
      Mastery/Unbroken Wall + generic Ascendance for custom tribes; turn-8 grace window;
      TopBar progress chip; GameOver path badge + flavor; AI loosely pursues its path)
- [x] AI hero care: wounded commander (≤60% HP) retreats to nearest friendly city, refuses
      suicide attacks (−100) and execute-range trades (−30); leveled heroes press harder
- [x] Headless engine simulation harness: server/engine.sim.test.ts runs full AI-vs-AI
      matches in Node (setTimeout neutered, manual runAiTurn drive) + victory.sim.test.ts
      unit coverage of all 7 paths (24 tests green)
      (Auren: full tech tree; Kharzul: win N battles; Sunwei: total city levels; Vessari: plunder
      stars; Nerivane: control water/ports; Dravok: walled cities held; custom tribe: generic path)
- [x] Victory progress tracker UI (path + progress in HUD/panel); gameover fires with
      faction-path flavor text
- [x] AI pursues its own path loosely (bounded weight adjustments)
- [x] AI hero care: protect low-HP hero (retreat toward friendly city), use aggressively when
      leveled (v16 leftover)
- [x] Headless simulation test: AI-vs-AI game runs N turns without errors, wins fire (vitest)
- [x] pnpm check + pnpm test clean; browser verify; checkpoint + deliver (v20 = 570aeedd)

# v21 ROADMAP — Impossible AI tier (skill-ceiling differentiator)
- [x] 4th difficulty "Impossible" — smarter brain (aiPro.ts), aiBonus=0: NO resource cheats
- [x] Threat map: enemy reach/damage per tile; refuse bad fights (score bar >2, lethal-tile
      penalty); retreat wounded (≤40% HP on lethal tiles); garrison capital when threatened
- [x] Task forces: shared war target, rally ring at 2 tiles, strike when 3+ assembled
- [x] Hold-the-prize lookahead: capture only when local force superiority (canHoldCity)
- [x] Economic optimizer: value-per-star research/training; counter-composition vs ranged/
      cavalry-heavy foes; water-aware ports; threat-aware walls
- [x] Faction-aware play: unique-unit bias, victory-path pursuit (enlightenment research,
      tidemastery ports, unbrokenwall walls)
- [x] Menu Impossible tier (☠ red styling + warning copy + tooltip); Hall of Conquest 4th tab;
      "The Unmaker" achievement; friend-challenge links accept impossible
- [x] Impossible sim tests: pro brain completes full matches on multiple seeds; deterministic
      seeded Math.random in harness (26 tests green)
- [x] Coalition polish (coalition.ts): pact members claim distinct leader cities each world turn
      (no overlapping targets), staggered convergence via claim persistence, betrayal — strongest
      partner turns on the weakest once the common enemy is broken; wired into both AI brains;
      5 unit tests in coalition.test.ts (31 tests green)

## Publish-stall investigation (v22.x)
- [x] Diagnose why production publish has been stuck for hours — root cause: 8.1MB monolithic
      Babylon chunk (barrel import) risking CI build OOM/timeout, plus stale server/index.ts
      confusing entrypoint detection; production URL 404s (no deploy ever completed)
- [x] Apply fix and retrigger publish — manualChunks splitting, lazy GameCanvas, tree-shaken
      Babylon submodule imports (chunk 8.1MB → 2.08MB, build 3m31s → 42s), sourcemaps off,
      removed stale server/index.ts, added pipeline shader side-effect imports (console clean)
- [x] Verify live production site serves the latest version — user provided production URL
      (polyclone-n6b64njm.manus.space); deployment reported successful, but site shows a BLANK
      PAGE on mobile Safari → new bug investigation below
      when leader falls behind
- [x] Run the built production server locally (NODE_ENV=production node dist/index.js) — starts
      clean, serves index (200, 370KB), babylon chunk (200, 2.1MB), tRPC auth.me responds; the
      deployed artifact itself is healthy

# v24 — Fog-of-war fix + graphics readability pass (user report, live site)
- [x] BUG root cause found: reveal pipeline itself works, but 1-MP units could never ENTER
      cost-2 forest (and mountains/water are tech-gated), so units got position-locked and fog
      never lifted. Fixed with the Polytopia rule: slow-but-passable terrain is enterable as a
      full-stop move whenever the unit has any MP left (reachableTiles clamps cost, stops pathing
      beyond). Verified headless: forest now reachable from the previously stuck spot; 31 tests green
- [x] Make fog rendering legible: unexplored = dark cloud slabs + flat mist puffs (map extent
      always legible, no void); explored-not-visible tiles get desaturated indigo wash on BOTH
      tile tops and decor materials (snow caps/houses no longer punch through); live-visible
      tiles full brightness
- [x] Graphics readability: two-tone trees with trunks, gray rocky mountains with white snow
      caps (no more "ice cube" cones), fruit = green bush + red berries, animal = brown critter
      with head/ears, mineral = glowing cyan crystal shards, ports get a cream sail marker,
      cities get a tribe-colored ground plate + cream houses with tribe-colored roofs
- [x] Verify in-browser (live save render matches game state: 34 explored tiles all in vision
      render bright — correct; fog bank reads clearly), 31 tests green, type-check clean
- [x] Fresh Pangaea game renders correctly (fog-cloud bank, two-tone trees, berry bushes,
      snow-capped mountains, city plate, hero halo), console clean, test save cleaned up
- [x] Verify v24 graphics/fog on the other map types (Highlands, Archipelago) — readability
      and fog confirmed correct in browser (snow-cap mountains/crystals on Highlands; centered
      capital island, water contrast, resources on Archipelago); console clean
- [x] Camera recenter fix: new game in same session now recenters on the player's capital
      (cameraGameSig in scene.ts)
- [x] Confirm the live production site serves the fog fix + graphics pass — superseded by the
      blank-page investigation (v25 section)

## v25 — Production blank page (user report, iPhone Safari)

- [x] Probe polyclone-n6b64njm.manus.space: HTML 200, all chunks 200, API 200 — but #root empty
- [x] Diagnose root cause: v23 manualChunks split React from react-dependent vendor code →
      cross-chunk circular init → "undefined createContext" → silent blank page (prod only;
      dev serves unbundled ESM). Reproduced in sandbox browser via manual module import.
- [x] Fix: single vendor chunk (React + dependents together); only Babylon split (independent,
      lazy-loaded). Verified locally: prod build served on :4174 renders the full menu.
- [x] 31 vitest green, tsc clean after fix
- [x] Verify fix on the live production URL after publish — polyclone-n6b64njm.manus.space now
      serves index-D4ukHSby.js + unified vendor-GgkRUVUS.js (no split react chunk); full menu
      renders in browser (factions, Impossible tier, challenges, leaderboard)
- [x] Report findings to the user

## Polytopia-Level Graphics Roadmap (user request — walkthrough document)

- [x] Research Polytopia's actual art style: visual pillars, references, technique breakdowns
      (docs/polytopia-style-research.md: Polysthetic modelling breakdown, official assets page,
      2 high-res gameplay screenshots inspected)
- [x] Audit Sunder's current renderer (scene.ts) against those pillars — 7 gaps identified
- [x] Write the staged roadmap document (5 stages, effort/payoff table, what to avoid)
- [x] Deliver the document to the user
- [x] Save a fresh checkpoint (v25.1 / a10d4a37) to re-trigger the publish (user request)
- [x] Investigate checkpoint sync: git log shows v25/v25.1 committed AND pushed (HEAD ==
      origin/main == a10d4a37); dev server restarted to force re-sync; production STILL serves
      old bundle. Conclusion: checkpoints are correctly stored; the card display + publish
      rotation failures are platform-side. → user to report at help.manus.im

## v26 — Graphics Stage 1+2 (approved roadmap) + AI Playtest Lab (on-demand)

### Stage 1: flat-shading foundation
- [x] Unlit flat colors on tile tops (emissive-only materials, no lighting gradients)
- [x] Palette discipline: 2-3 hand-picked value steps per terrain in a central palette module
- [x] Slab side walls darkened by fixed ratio (color does the depth work)
- [x] Shallow-water band around coastlines (pale ring where land meets water)
- [x] Disable terrain cast shadows; trim bloom to accents only (fires/crystals)
- [x] Verify: board reads as flat painted quilt, no gradients across tile tops

## v27+ — Monetization roadmap (user-approved three-tier structure)

### Tier structure (locked with user)
- Base game (free): quick matches, 6 standard tribes, standard maps, multiplayer, Tribe Forge basics
- Upgraded base: purchasable tribe skins, premium unlockable tribes, premium map packs
- Story Mode: near-standalone campaign game with its own pack purchases
- Ultimate pack: single purchase including everything

### Foundation
- [x] Catalog + entitlements DB schema (code catalog shared/products.ts; purchases + entitlements tables, migration 0004 + indexes)
- [x] Stripe integration (server/stripe.ts: checkout sessions w/ price_data + metadata, /api/stripe/webhook raw-body route, idempotent fulfillment, test-event handling; 8 vitest specs)
- [x] Store UI (/store page: ultimate hero card, grouped sections, owned/locked states, purchase history, success/cancel return handling; main-menu Store entry)
- [x] Ultimate pack bundling logic (bundle grants all entitlement keys, fan-out on fulfillment; savings copy in store)
- [x] PWA install support (manifest.json + sw.js network-first shell/cache-first assets, 192/512 maskable icons, apple meta tags; SW registered in prod builds only)
- [x] App stores deferred until web monetization is proven (decision locked with user)

### Premium content
- [x] Tribe skin system (recolor/costume variants on the Stage 2 character rig) + purchasable skins
- [x] New premium tribes (unlock with purchase)
- [x] AI Map Builder: LLM designs/refines maps (terrain balance, spawn fairness, chokepoints) → curated premium map packs
- [x] Premium map packs purchasable + selectable in game setup

### Story Mode
- [x] Campaign: conquer territory-by-territory with your forged tribe (Chapter I: The
      Sundering — 5 scripted seed-locked missions with narrative briefings, objective types
      domination/survive/capital, forged-tribe support; mini-games deferred to a future chapter)
- [x] Chapter/pack release format with separate purchases (STORY_CHAPTERS registry in
      shared/story.ts; per-chapter SKU story_ch1; progress tracked per mission)
- [x] Story Mode entry gated by purchase; included in ultimate pack (/story lock screen +
      menu Story button; GameOver mission banner + Continue Campaign)

### Stage 2: procedural character units
- [x] Shared character rig from primitives (torso, head, limbs) in a new units module
- [x] Per-class props: spear/bow/shield/hammer/sail etc. for all unit classes incl. uniques
- [x] Per-faction costume colors + headgear variants
- [x] Tribe-colored base block under each unit; keep health badge readable
- [x] Hero keeps distinct crown/banner accent on the new rig
- [x] Chunky hop movement retained/verified with new meshes
- [x] Verify across factions + map types in browser; tests green; checkpoint

### AI Playtest Lab (admin-only, on-demand)
- [x] Read automation/scheduling + LLM skills before design (on-demand runs, no cron needed)
- [x] Server: headless engine run wrapped as a playtest job (server/playtest.ts — LLM picks from
      an enumerated legal-action list each turn; scripted-AI fallback on any LLM failure)
- [x] LLM feedback report per match: balance/clarity/fun/pacing scores + findings + verdict
      (structured JSON via json_schema → playtest_runs.feedback)
- [x] DB table playtest_runs + tRPC routes start/list/get (adminProcedure-gated)
- [x] Admin dashboard /playtest-lab: run form (world/size/tribe/turn budget), live-polling run
      list, report detail (score pills, findings, match table, model turn notes); admin-only
      menu entry (AdminLabLink)
- [x] Vitest: 4 new specs (engine run w/ mocked LLM, LLM-error fallback, anon + non-admin
      gating); full suite 42 green. Live smoke test vs real gemini-2.5-flash: 8 turns/6.4s,
      8 LLM actions, real report. Browser verified; checkpoint below

## v28 — Playtest-driven balance fixes (user-approved, docs/playtest-review-2026-07-24.md)

- [x] Anti-snowball: barbarian camps target the score leader (faster action cadence when a
      leader exists, warbands up to 3 raiders, raiders prefer leader units/cities at 2× bias)
- [x] Anti-snowball: coalition pact members gain +15% attack vs. the common enemy
      (coalitionStrikeBonus in rules.ts; battle-preview chip "Coalition +15% vs leader")
- [x] Riding tech cost bumped: base 4★ → 6★ (≈7★ → ≈10★ after empire scaling)
- [x] Auren early game: Scholars tribes start with 7★ instead of 5★
- [x] Ruin economy: star payouts taper ×0.75 per prior ruin claimed (floor 40%, min 2★),
      applied to both regular ruins and Great Ruins
- [x] Log clarity: camp messages carry (x, y) coords + leader-hunt callout; Research panel
      states the Scholars 20% discount is included in shown costs
- [x] Vitest coverage: server/balance.v28.test.ts (6 specs); full suite 69 green
- [x] Re-ran all 4 original seeds with identical params (scripts/rerun-v28.ts); before/after
      analysis in docs/v28-balance-verification.md (run 3 leader gap 1.36→1.04; mechanics
      verified firing in logs; avg gap unchanged — income taper proposed as next lever)
- [x] Checkpoint + deliver with before/after comparison

## v29 — Fix Polytopia's pain points (user-approved direction: no income taper, Polytopia-style levers)
### Late-game QoL (tedium)
- [x] "Next unit" cycling: button + hotkey (Tab/N) jumps to the next unit with moves left
- [x] Units-left indicator on the end-turn button (e.g. "3 units can still act")
- [x] End-turn confirmation only when units still have moves (skippable via setting)
- [x] Speed up AI/world turn resolution pacing (reduce artificial delays for large empires)
### Anti-turtling (aggression-rewarding, Polytopia-style)
- [x] Siege pressure: cities besieged by adjacent enemies produce reduced income (no walls nerf)
- [x] Score/economy rewards for offense: capture bonus already exists — verify battle-win star
      bounty or equivalent aggression incentive; tune if missing (added +8 score per battle won)
- [x] Default turn cap review: ensure score-mode default runs tight (Polytopia-style 30-turn cap)
- [x] AI: reduce passive-defense bias when ahead in force (push advantage instead of camping)
### Validation
- [x] Vitest coverage for QoL logic + siege/aggression tuning; full suite green
- [x] Visual verification of new UI affordances
- [x] Playtest-lab runs to sanity-check pacing/fun scores; checkpoint + deliver
      (docs/v29-balance-verification.md — run3 pacing 7 vs ~4; run1 early death traced to LLM
      misplay via deterministic all-scripted sim on same seed: scripts/simcheck-v29.ts)

## Backlog (found during v29 validation, not yet scheduled)
- [x] playtest.ts: turnNotes empty when a match ends before the notes flush (early gameover) — run1
      (fixed: synthetic terminal note recorded when the LLM tribe is eliminated / match ends early)
- [x] playtest.ts: occasional null turn note recorded (run3 T9)
      (fixed: literal "null"/blank note strings filtered before recording; test added, 78 green)

## v30 — Story Mode Chapter II + Store skin previews (user request)
### Chapter II: campaign continuation
- [x] Write Chapter II narrative arc (5 missions) continuing from the Chapter I finale
- [x] Define 5 seed-locked missions in shared/story.ts (objectives, opponents, unlock chain)
- [x] Chapter II gating: unlocked after completing Chapter I mission 5 (same story.ch1 entitlement;
      chapterUnlocked/nextCampaignMission added to core/story.ts; product copy updated to 10-mission saga)
- [x] Story page UI: chapter sections, locked-state copy, mission cards for Chapter II
- [x] GameOver/campaign progression handles ch2 mission completion + next-mission continue
      (missionById/evaluateMission resolve ch2 ids; objective kinds reused — covered by tests)
- [x] Vitest coverage: mission definitions valid, unlock chain, objective evaluation on ch2 types
      (server/story.ch2.test.ts — 84 tests green)
### Store skin previews
- [x] Reusable SkinPreview component: small Babylon canvas rendering the character rig with the skin applied (rotating idle)
- [x] Wire previews into Store product cards for the 6 tribe skins (lazy-mounted, dispose on unmount)
- [x] Fallback for software renderers / canvas failure (static swatch)
- [x] Visual verification on /store; console clean (all 6 rigs render live with skin colors; no console errors)
### Wrap-up
- [x] Full suite green + tsc clean; checkpoint + deliver (84 tests, 15 files)

## v31 — Mission stars + Skins picker previews + Chapter II epilogue (user request)
### Mission star ratings
- [x] Star criteria per mission: 1★ win objective, 2★ win under par turns, 3★ also lose no city (parTurns per mission in shared/story.ts)
- [x] Track cities-lost for the human tribe during a mission run (state/stats)
- [x] Persist best stars per mission in story progress (localStorage, backward-compatible with done map)
- [x] GameOver screen: show stars earned this run + criteria breakdown
- [x] Story page: show best-star rating on mission cards (+ total star counter, briefing modal criteria)
- [x] Vitest: star computation (turn/city criteria), persistence keeps best, legacy progress migration (11 tests)
### Skins picker previews
- [x] Reuse SkinPreview component in SkinsPanel skin cards (eye-toggle expands one lazy canvas at a time)
### Chapter II epilogue
- [x] Generate epilogue illustration (Shatterlands reforged, painterly, matches game's indigo/amber palette)
- [x] Epilogue cinematic card after completing ch2-m5: illustration + staged narrative + tease, then back to campaign
- [x] Only shows once per completion (re-viewable via "Watch the epilogue" button on Story page)
### Wrap-up v31
- [x] Full suite green + tsc clean (95 tests / 16 files); visual verification in browser (epilogue card, star breakdown, Story/Store pages) — fixed an event-handling bug where one click closed the epilogue instead of advancing lines; checkpoint + deliver

## v32 — Star rewards, campaign stats, par hint

### Star-gated chapter rewards
- [x] Define chapter rewards (unique banner + player title per chapter at 15/15 stars) in shared story/rewards module
- [x] Unlock logic: derive earned rewards from best-star progress (client story layer), with helper + tests
- [x] Reward UI: rewards strip on Story page chapter headers (locked/unlocked states, progress x/15)
- [x] Apply rewards: unlocked banner usable in Tribe Forge / title shown on Story page header

### Campaign stats summary
- [x] Track per-mission completion stats (turns taken on best win) alongside stars
- [x] Stats panel on Story page: total stars, missions done, fastest finishes, stars per chapter

### Par-turn hint in-game
- [x] Show "Par: turn N" (and no-city-lost status) in the top bar during story missions

### v32 wrap-up
- [x] Tests + tsc green (103 tests); visual verification via temp dev-preview (removed); checkpoint + deliver

## v33 — Visual polish milestone (Polytopia-grade diorama look)

### Extruded diorama tiles
- [x] Give terrain tiles extruded side walls (darker shade of top color) so the board reads as a chunky diorama (LAND_SKIRT +0.34 below waterline; mountain slabs share the land side tone)
- [x] Add soft drop shadow beneath the island/tile cluster to sell the floating-world look (per-tile blob shadows on a void plane; fog bank lowered + darkened so the silhouette pops)
- [x] Coastline/water treatment: shore band or depth shading where land meets water (pre-existing shore bands kept; verified with the deeper cliffs)

### Palette unification pass
- [x] Consolidate terrain colors into a tight ramp (≤2 shades per hue family), harmonized with the indigo void background (grass desaturated, mountain top → mossy slate, fog → #191940)
- [x] Ensure tribe accent colors stay readable against the unified terrain (verified in-game: Auren blue, owned-territory tint read clearly)

### Unit hop/squash animation
- [x] Units hop between tiles with squash-and-stretch on takeoff/landing (already implemented in animateMove — arc hop + stretch/squash keys, ~370ms)
- [x] Polish pass: landing dust puff FX + idle "settle" so movement reads even better (spawnDustPuff: 3 discs expand+fade ~250ms on landing)

### Wrap-up
- [x] Visual before/after verification in-game; tests + tsc green; checkpoint + deliver (before/after shots compared; warrior move verified live; 103 tests, tsc clean)

## v34 — Visual polish round two (user feedback + ambient life)

### Mountain & ruins fixes (user feedback)
- [x] Blend mountain bases into the tile top (rocky base skirt / wider footprint) so peaks don't sit as cones on a flat square (broad low skirt frustum + shoulder growing from it + scree boulders, seeded per tile)
- [x] Redesign ruins: broken columns + rubble + subtle glow instead of the plain purple cone (cracked plinth slabs, 3-column broken ring, leaning obelisk, rubble, hovering amber relic)

### Ambient micro-motion
- [x] Water shimmer (subtle animated sparkle/opacity ripple on water tiles) — pre-existing emissive pulse kept and verified
- [x] Drifting cloud shadows across the board (slow, sparse) — 3 soft alpha discs, diagonal wrap drift, skipped in low-quality mode
- [x] Occasional birds flying over forests (rare, small, despawning) — flock of 2-3 chevrons every ~14-24s from a random forest tile, glide off-board and despawn

### Coastal cliff variation
- [x] Sandy band on shoreline tile skirts (coast tiles get a sand-colored upper skirt strip)
- [x] Stepped/varied cliff profile on some coastal tiles for silhouette variety

### Attack impact FX
- [x] Brief hit flash on the defender (white/red material flash) — pre-existing, kept and paired with new knockback
- [x] Directional knockback nudge on the defender matching attack direction (recoil away from attacker, snap back)
- [x] Shatter death FX: killed unit's geometric pieces burst apart, tumble with gravity, and fade out (per-piece impulse + spin + bounce + fade; wired into combat event for both defender and retaliation kills)

### Wrap-up
- [x] Visual verification in-game (mountains, ruins, coast band, cloud shadows confirmed live; combat FX exercised via engine console — no errors); tests 103 green + tsc clean; checkpoint + deliver

## Interlude — Polytopia feature-gap analysis (user request; v34 visual work paused mid-flight)

- [x] Research Polytopia's complete feature set (economy/city leveling, tech, units, tribes, modes, multiplayer, monetization)
- [x] Research player sentiment: praise, criticism, most-requested features (reviews, Reddit, Steam)
- [x] Audit Sunder's current feature set from the codebase
- [x] Write gap-analysis document: Polytopia-only features, shared features, Sunder-only additions, recommendations (incl. city population/leveling question) — docs/feature-gap-analysis.md
- [x] Deliver document for review

## v35 — Economy depth (user-approved Tier 1 from gap analysis; starts after v34 ships)

### Core loop
- [x] City level-up reward choice (workshop/explorer at L2, wall/stars at L3, borderGrowth/popGrowth at L4, park/superUnit at L5+ — modal for human, AI auto-picks, endTurn blocked while pending)
- [x] Unit capacity per city (city levels + 1); training blocked at cap with count/cap display in the train panel
- [x] Scoped building set: Lumber Hut (forest), Farm (grass), Mine (mountain) — +1 pop each, build buttons in SelectionPanel, tile meshes rendered (Sawmill deferred: three buildings close the loop; adjacency math is better validated after playtests)
- [x] Interactive ruins: ALREADY EXISTS — step-on ruins grant tapered random rewards (stars/tech/free unit) + guarded Great Ruins; no work needed
- [x] Tech cost scales with city count: ALREADY EXISTS in techCost() (baseCost + tier×(cities−1)×1.5); no work needed
### Support
- [x] AI (both brains) understands rewards (auto-pick heuristic), buildings (places when resources run dry), capacity (train gated), ruins (pre-existing interactive rewards)
- [x] Vitest coverage: economy.v35.test.ts (9 tests) + sim harness fixes — 112 tests green, tsc clean
- [x] Balance validation run via playtest harness; visual verification in browser (4-seed probe: rewards through superUnit picked, up to 13 buildings placed, city level 5 reached, no stalls; in-browser: reward modal choice→wall applied, capacity display "1/5 units", research→harvest→build hut loop verified end-to-end with correct gating)

## v36 — Colossus ability + adjacency buildings + economy tutorial (user-approved)

### Colossus signature ability
- [x] Wall-crush: Colossus attacks vs walled cities ignore the fortified defense bonus, and a hit on a walled city tile breaks the walls (with log/FX)
- [x] Knockback: surviving defenders are pushed 1 tile away from the Colossus (blocked push = extra damage instead, Polytopia-style)
- [x] Battle forecast shows the ability; AI (both brains) values Colossus vs walled targets appropriately
- [x] Colossus visual/FX feedback for wall-break and knockback (slideUnit hurl arc + masonry burst; in-browser check in phase 4)

### Adjacency buildings
- [x] Sawmill (grass, unlocked with forestry): +1 pop per adjacent Lumber Hut; existing sawmills also grow +1 when a new hut lands next door
- [x] Windmill (grass, unlocked with organization): +1 pop per adjacent Farm; same retro-growth on new farms
- [x] One per city limit; build UI shows projected pop gain per site (+N chip); sawmill/windmill tile meshes rendered
- [x] AI places adjacency buildings when 2+ neighbors present (both brains, best-site pick)

### Economy tutorial beat
- [x] Extend tutorial with steps for harvesting, buildings/adjacency, and the level-up reward choice (incl. Park vs Colossus dilemma)
- [x] Harvest step advances contextually on opening a city panel; veterans who finished the old tutorial see only the new economy beats once (separate econ-done key)

### Wrap-up
- [x] Vitest coverage for all mechanics (server/v36.features.test.ts, 8 tests); full suite 120/120 green
- [x] Type-check clean + in-browser verification (tutorial beats, city panel +N chips); checkpoint + deliver

## v37 — Quake, Market, city planner overlay (user-approved)
### Colossus Quake
- [x] Once-per-game Quake action: damages all adjacent enemy units 5 HP, breaks walls on adjacent walled city tiles, ends the unit's attack for the turn
- [x] Quake button in the unit selection panel (visible only for Colossus with quake unused), with confirm-free single click + log entry
- [x] Quake FX: screen-shake / ground ripple + hit flashes on all affected units
- [x] AI (both brains) uses Quake when 2+ adjacent enemies or an adjacent walled city makes it worthwhile
### Market adjacency building
- [x] Market building def: grass, unlocked with Sailing, base 0 pop, +1 star income per adjacent Sawmill/Windmill, one per city (Workshop is a city reward, not a tile building — partners are the mills)
- [x] Star income integration in starIncome(); build UI shows projected +N★ chip; tile mesh in renderer (striped awning stall + gold coin)
- [x] AI places Markets when 2+ adjacent income partners exist
### City planner overlay
- [x] Planner toggle (bottom bar) dims the map and overlays projected adjacency/pop values on every buildable site of the selected tribe's cities
- [x] Overlay values update live as buildings change; Escape or re-toggle closes
### Wrap-up v37
- [x] Vitest coverage for quake + market income; type-check + full suite green
- [x] In-browser verification (quake button/FX, market chips, planner overlay); checkpoint + deliver

## v38 — Roads & Trade Network, Score Breakdown, Live Planner
- [x] Roads: road flag on tiles, build-road action (tech-gated, cost, buildable on own/neutral passable land), road rendering on tiles
- [x] Road movement: units move cheaper along connected road tiles
- [x] Capital Trade Network: cities connected to the capital via roads earn +1 star/turn; income + city panel indication
- [x] AI builds roads to connect cities to the capital when affordable
- [x] Score breakdown panel on game-over screen (tech, cities, buildings, kills, etc.) for all tribes
- [x] Live planner mode: overlay stays open while building; chips update after each placement; build clicks work through planner
- [x] Vitest coverage for roads/trade network + score breakdown; type-check + full suite green (140/140)
- [x] In-browser verification (roads render, trade income, game-over breakdown, live planner); checkpoint + deliver

## v39 — Road raiding, trade pulse, Hall of Conquest breakdowns

- [x] Road raiding: enemy units standing on a road tile block it as a trade node (connectedCityIds treats occupied roads as severed); severed cities lose the +1★ trade bonus until the raider is cleared
- [x] Raid feedback: log entry when a route is newly severed, raided-road visual cue on the map, and a severed indicator in the city panel trade badge
- [x] AI awareness: both brains value attacking raiders on their roads / consider parking units on enemy roads
- [x] Trade-route glow: animated gold pulse flowing along connected road paths toward the capital
- [x] Hall of Conquest: persist each finished match's score breakdown and show it in the history screen (expandable per past match)
- [x] Vitest coverage for road raiding + breakdown persistence; type-check + full suite green
- [x] In-browser verification (raid severs income, pulse renders, hall shows breakdowns); checkpoint + deliver
- [x] v40-prep: headless AI-vs-AI batch simulation script with score collection
- [x] v40-prep: balance report from AI match batch results
- [x] Tribe & character roster document with Polytopia-style visual descriptions for external art mockups

# v40 — Balance pass from batch findings (user-approved fixes 1+2)
- [x] Staggered-start star compensation: later turn slots get +1 star per slot on turn 1
- [x] Nerivane Tideborn land-side buff: coastal cities earn +1 star (starIncome)
- [x] Plunder King victory threshold lowered 45 → 35
- [x] Vitest coverage for all three changes (balance.v40.test.ts); 155 tests + tsc green
- [x] Re-run 160-game batches (default + rotated) and compare slot spread / tribe win rates (two iterations: +1★ once → +slot★ for 5 turns)
- [x] Archipelago-only batch (80 games) — Nerivane 20% on archipelago vs 8% continents post-buff
- [x] Before/after verification report delivered; checkpoint saved

# v41 — Tempo & Auren pass (user-approved fixes)
- [x] Randomized turn order: seeded shuffle of acting order each game round (attacks slot 0's structural first-strike tempo)
- [x] Auren nerf: reverted v28 +2 scholars starting stars (20% tech discount stays)
- [x] Vitest coverage for both changes; 158 tests + tsc green
- [x] Re-run verification batches (default, rotated, archipelago) and compare slot spread / Auren win rate
- [x] Batch harness fix: nominal "human" slot flipped to AI after newGame — previous batches had one rotating slot playing without aiBonus, contaminating all slot statistics (sim-only change)
- [x] v41.1 follow-up: scholars tech discount 20% → 10% (starting-stars revert alone left Auren at 72%; Enlightenment landed turn ~17 vs 22+ for other paths); UI copy + roster doc updated; 159 tests + tsc green
- [x] v41 report delivered; checkpoint saved (6dcf442e)

# v43 — Mockup-driven character upgrade (pilot: Nerivane Warrior)
- [x] Warrior v2 rebuilt against the painted lineup mockups: faceted bone mask recessed in a
      dark cowl, back-swept glowing crystal fin crest, two-value armor (dark plates + mid-teal
      chest plate), glowing droplet sigil, full arms with bone hands gripping an oversized spear
- [x] Fractured stone hex base with connected tribe-glow fissure (lineup mockup convention;
      replaces the flat tribe puck on v2 units, helper is tribe-agnostic for later lineups)
- [x] Verified in Model Lab (40px color/gray + 8 angles) and on-board; 159 tests + tsc green
- [x] Feedback pass 2 (designer notes): V-tapered chest with angled planes + narrow waist,
      smaller angular mask floating over a dark neck gap, shorter back-swept fin crest,
      thick partisan spear (grip band, glow gem, side barbs), feet with turned-out stance,
      droplet sigil replaced by the wider wave-fin glyph; all 7 tribe lineup mockups archived
      as the reference set (Polytopia unit/terrain clarity as the bar, not the look)
- [x] Merged external contributor branch `claude/warrior-v2-graphics` from GitHub into main
      (fast-forward, no conflicts); reviewed against v42 conventions — same primitive vocabulary,
      shared cached materials + single emissive accent, ~28 meshes (inside the 900-tri foot
      budget), non-Nerivane classes untouched; 159 tests + tsc green; Warrior v2 verified in
      Model Lab (40px color/gray + 8 angles); pushed to both remotes and checkpointed for publish
- [x] Roll the v2 skeleton out to the rest of the Nerivane set (archer/defender/rider/tidecaller/hero):
      extracted the pilot body into a shared `v2Body()` (mask, neck gap, V-taper chest, pauldrons,
      stone base, per-class arm poses) so proportions stay identical across the lineup; archer gets
      a pale recurve bow arc + nocked arrow + swept quiver, defender a narrow tower shield with
      pointed foot and shield-mounted glyph, rider the aquatic mount + wide accent tail fin,
      Tidecaller a robed body with tall crest and wide 3-tine trident, Nereth the crown/cape/banner
      hierarchy capped at 1.08H; crest hierarchy enforced (tall crest only for unique unit + hero)
- [x] Per-tribe v2 lineups from the remaining mockups (Kharzul horns, Auren arcs, Vessari hood,
      Mycelon cap) — see v44 below

# v46 — App-Store-readiness pass: opening screen + board graphics
- [x] Brand assets never break: procedural inline-SVG mark, chiseled wordmark and
      floating-shard backdrop (Brand.tsx) with painted-art-when-available fallback —
      the menu and loading splash previously showed broken images outside Manus hosting
- [x] Per-biome terrain GEOMETRY (not just color): palm / pine / acacia / conifer tree
      families, mesa / crag / classic mountain families
- [x] Living sea: fish fins in ~45% of shallow tiles, bobbing motion, drifting wave
      glints, slow cloud drift — all on one shared per-frame registry
- [x] Fog reads as cloud cover: pale per-biome palette, four rounded puffs per tile with
      shaded bellies (a new player's opening board is almost all fog — it is the first
      thing anyone sees)
- [x] Settlement ownership softened: thin deepened kerb + bright corner posts instead of
      a saturated frame that read as a UI selection box
- [x] Turf-over-earth cliff faces per biome — the board reads as a floating slab of world
- [x] perf: freeze static board world matrices + materials (water excluded so shimmer
      still animates); ~650 active meshes no longer recompute every frame
- [ ] Follow-up: merge static decor per material to cut draw calls further (mobile)
- [ ] Follow-up: unit/combat feedback juice; per-biome city architecture

# v45 — Reconciliation: designer-locked v3 character system + biome maps
- [x] Two parallel character implementations existed: the Manus-side v43/v44 checkpoints
      (built on the v2 warrior) and the externally reviewed claude/nerivane-warrior-v3
      lineage (per-unit designer sign-off: warrior v3/v3.1 locked, archer, defender,
      rider + mount revision, tidecaller, hero, then all eight tribes). This merge
      resolves render/lab files in favor of the reviewed v3 system; the parallel v2
      rollout remains in git history (471b06b)
- [x] Biome palettes per map preset (continents/archipelago/highlands/pangaea) with
      per-biome water/shore/tree/rock/fog theming; minimap follows
- [x] Polytopia-style cloud fog-of-war, seeded forest density, grass micro-decor,
      wave glints — verified in-game across presets; 159 tests + tsc + build green

# v44 — Cross-tribe rollout of the v2 board-model standard
- [x] Per-tribe accent glow material: board renderer + portrait pipeline now key the emissive
      accent on the costume accent (`accentFor(defIndex)`), one cached material per hue, so every
      tribe's crest/glyph/fissure glows in its own color instead of Nerivane teal
- [x] Per-tribe crest hierarchy (`tribeCrest` / `tribeCrestTall`): Auren diadem arc + shard,
      Kharzul forge horns with ember tips, Sunwei wide harvest cone, Vessari swept pointed hood,
      Dravok stone brow slab + ridge, Valkyra storm helm with swept wings, Mycelon gilled spore cap,
      Nerivane crystal fin; tall centre spire added only for unique units and heroes
- [x] Per-tribe chest glyph (`tribeGlyph`): tablet (Auren), anvil (Kharzul), sun disc (Sunwei),
      double chevron (Vessari), bastion (Dravok), lightning bolt (Valkyra), spore trio (Mycelon),
      wave fin (Nerivane) — raised geometry, accent-hued, readable at 40px
- [x] Extended the v2 skeleton to all 8 tribes (gate is now `defIndex >= 0`; tribeless camp
      raiders keep the legacy rig) — warrior/archer/defender/rider/unique/hero share one body
- [x] Land-tribe riders get a saddle pennant as their rear-mass silhouette cue; Nerivane keeps
      the aquatic mount + tail fin
- [x] Model Lab: tribe selector + `?tribe=<index>` deep link so any lineup can be reviewed or
      screenshotted directly; export filenames now carry the tribe slug
- [x] Verified all 8 lineups in Model Lab (40px color + grayscale + 8 angles); 159 tests + tsc green

# v42 — Designer production standard: Nerivane board-model + portrait pipeline
- [x] Audit characters.ts + palette/material helpers against the locked spec (heights, tri/mesh budgets, material caching, raised-geometry sigils)
- [x] Path 1: Nerivane board pass — warrior (spear + wedge-fin crest), archer (0.7H bow + swept quiver), defender (half-area shield), rider (abstract aquatic mount: low body, dorsal fin, tail wedge), Tidecaller (flared robe, tall crest, 1.3H trident), Nereth hero (1.08H, thick crown, cape, banner-spear, aqua rim glow)
- [x] Path 1: shared cached materials / vertex colors + single emissive accent material; budgets ≤900 tris foot / 1200 hero / 1500 mounted; ~12 mesh groups common, ~16 hero/mounted
- [x] Fissure moved off units: tile-level glowing-fissure overlay for selection/active-unit state
- [x] Path 2: automated portrait renderer — orthographic 3/4 camera, transparent 1024px PNG masters, 80% frame fill, shared feet baseline, WebP exports at 512/256/128/64
- [x] 40px acceptance test: color, grayscale, eight rotational views for all six Nerivane units (/model-lab dev page)
- [x] Engine bug fix found during verification: randomized opening order stalled solo games when an AI acted first (newGame never kicked the AI chain) — fixed + kept turn flow verified in-browser
- [x] Engine hardening: legacy saves (pre-v41, no turnOrder/orderPos) backfilled on continueGame/loadOnlineSnapshot
- [x] Tests + type-check green (159/159); browser verify (select → fissure overlay → move → Undo); checkpoint + deliver for designer review

# v49 — iOS handoff verification (Manus, against Sunder-iOS-Handoff.docx)
- [x] FIXED — blocker for a clean Mac clone: `scripts/gen-app-icons.mjs` imported Playwright by
      absolute sandbox path (`/opt/node22/lib/node_modules/playwright/index.mjs`) and pinned a
      sandbox-only `executablePath`, so `pnpm icons` — and therefore step 2 of the handoff,
      `pnpm ios:sync` — could only ever run in this sandbox. Now resolves Playwright normally
      (declared devDependency) with global paths as fallback, pins an executable only when that
      exact build exists, and passes container-only Chromium flags only on Linux. Failure mode is
      now an actionable message naming the install command instead of ERR_MODULE_NOT_FOUND.
- [x] Verified regeneration is visually identical to the committed assets: a different Chromium
      build differs by ~2 bytes of PNG encoder metadata but PIXELS ARE IDENTICAL on splash, icon
      and PWA icons, so the committed assets stand and the byte-churn was reverted
- [x] `pnpm build` emits dist/public (4.4M) and `npx cap sync ios` copies the real vite build
      (assets/, sw.js, manifest) into `ios/App/App/public/`, which is git-ignored via ios/.gitignore
- [x] Confirmed the handoff's headless-verifiable claims: capacitor.config.ts (backgroundColor
      #141433, contentInset never, scrollEnabled false, webDir dist/public), SPM path with no
      Podfile (so the handoff's `pod install` step is correctly described as a no-op), Info.plist
      light status bar + Xcode-managed version keys, viewport-fit=cover, 6 safe-area rules,
      sw.js in the build, no tracked file over 1MB. 185 tests + tsc + production build green.
- [ ] MAC-ONLY (cannot be verified here): signing identity + real bundle id, device run, launch
      transition flash, notch/home-indicator clearance, drag frame rate on a full 13×13, rotation,
      offline failure modes for duels/leaderboard, IAP decision (guideline 3.1.1), privacy answers

# v50 — Mac-free iOS builds via GitHub Actions (user has no Mac)
- [x] Prepared the Xcode project for unattended CI: committed a SHARED scheme
      (ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme — Xcode writes schemes to the
      git-ignored xcuserdata by default, so a clean clone had none and `xcodebuild -scheme App`
      would have failed), plus ios/App/ExportOptions.plist for app-store-connect distribution with
      manual signing and placeholders CI substitutes
- [x] GitHub Actions workflow (.github/workflows/ios.yml) on macos-15: installs deps, builds the
      web app, `cap sync ios`, imports the signing cert into a throwaway keychain (with
      set-key-partition-list so codesign cannot block on a UI prompt), installs the provisioning
      profile and reads its real name/UUID/bundle id out of the file rather than trusting a
      hardcoded string, archives, exports, validates with altool then uploads to TestFlight.
      Build number comes from the run number so Apple can never see a duplicate. Keychain and
      API key are deleted in an always() step.
- [x] No-secrets `verify` job builds unsigned on every push: runs tests + type-check, re-renders
      the brand assets and fails if the committed icon/splash have drifted from the sigil source
      (pixel comparison, since PNG encoder metadata differs between Chromium builds), and asserts
      public/index.html AND public/assets exist inside the built .app so a cap-sync regression
      cannot ship an empty shell
- [x] Wrote docs/IOS-CI-SETUP.md: the browser-only credential path, including creating the
      distribution certificate with `openssl` instead of Keychain Access (verified the full CSR →
      cert → .p12 chain end to end in the sandbox), the exact seven repo secrets, the optional
      environment approval gate, a failure-mode table, and honest limits (on-device judgement
      calls, the IAP decision under guideline 3.1.1, the privacy questionnaire)
- [x] Validated: actionlint with shellcheck enabled reports 0 errors; YAML parses; the asset-drift
      check and the openssl chain were both dry-run locally
- [x] Pushed everything except the workflow file to GitHub (e354de8): docs/IOS-CI-SETUP.md, the
      shared Xcode scheme, ExportOptions.plist, README pointer
- [x] Workflow file is ON GitHub — no manual paste was needed after all. The Manus GitHub App
      cannot create `.github/workflows/*`, but this session's credentials can; pushed as fb939f5.
      The workflow was authored fresh against the tree rather than reused, which surfaced two
      things that would have failed the first run: `pnpm test` needs any non-empty
      STRIPE_SECRET_KEY (server/stripe.ts builds its client at import and the SDK throws on an
      empty key — 162 passing/5 files red without it, 185 green with it), and the repo is SPM with
      no App.xcworkspace, so xcodebuild must target `-project ios/App/App.xcodeproj`.
- [x] Split three ways instead of two: `verify` on Linux (tests, type-check, asset drift, web
      build), `ios-build` on macOS (compiles unsigned, asserts the web build is inside App.app),
      `testflight` manual. macOS minutes bill at 10x Linux on private repos and only the last two
      need Xcode. Repo is currently public, so it is all free either way.
- [x] Run #2 fully green end to end: verify ✅, unsigned macOS build ✅ (xcodebuild 47s, web-build
      assertion passed), testflight correctly skipped on a push event.
- [ ] AWAITING USER: enrol in the Apple Developer Program, register the bundle id, add the seven
      secrets, then run the workflow — the `verify` job proves itself on the next push regardless


## Overnight pass — Polytopia research + graphics (this session)

- [x] Surveyed Steam negative reviews, App Store critical reviews and Steam community discussion
      for what Polytopia players actually complain about → docs/POLYTOPIA-COMPLAINTS.md, with each
      complaint mapped to what Sunder does today and a recommendation
- [x] Measured the snowball question instead of guessing at it (scripts/snowball-audit.mts, 80
      games): leading on turn 10 wins 38% of the time against a 25% chance baseline, the city lead
      only locks in 72% of the way through, and 62% of winners were behind at turn 10. Sunder does
      NOT snowball — no catch-up mechanic is warranted, and the open question runs the other way
- [x] Same run confirms the central design bet: seven distinct win conditions fired across 80
      games (domination 25%, enlightenment 23%, plunderking 15%, bloodforge 14%, tidemastery 11%,
      greatharvest 8%, unbrokenwall 5%) against the community's figure of 99% Domination in
      Polytopia multiplayer
- [x] Graphics: opening shot now frames the explored region rather than pulling toward the board
      centre (turn one was ~two thirds cloud bank); mountains squatter, darker and de-blued with
      the snow cap cut back; mountain tile tops moved into the land-family green so a range stops
      breaking the quilt; neutral villages given a thatch accent instead of drawing every part
      from the same beige as their plaza
- [ ] OPEN, needs a product decision: shared/products.ts sells two premium tribes with mechanical
      perks (Valkyra halves enemy retaliation). Selling tribes as DLC is the single loudest
      complaint in Polytopia's negative reviews and ours are power rather than cosmetic. Recommend
      moving both to the free roster and keeping the money in skins, map packs and the campaign
- [ ] OPEN: touch-target pass on a real phone, aimed at crowded tiles — the one item on the
      research list that cannot be done from here
- [ ] OPEN: the Rider silhouette is the least readable of the six classes at 40px; the other five
      pass cleanly


## Tribe balance — where it stands after the sweep session

Shipped and cross-validated (240 games per point, two seed blocks, seeded RNG):

- [x] TECH_ESCALATION 0.6 -> 0.9. Auren 40% -> 29%. The Scholars discount was
      NOT the cause — 0.95 and 1.00 both left it at 35%; the Enlightenment path
      was. 1.0 gives better total spread but pushes Auren to 18%, which is the
      same bug inverted.
- [x] Storm Legend 4 -> 3 veterans. Valkyra 20% -> 25%. A unit is veteran at 3
      kills, so 4 asked for twelve kills across four survivors and fired ONCE in
      48 games.
- [x] Unbroken Wall reformulated: 2 walls held for 6 consecutive rounds, not 3
      walled cities. Dravok 18% -> 23%, and balance spread 35 -> 30. Dravok holds
      2.36 cities; the old goal asked for more cities than it ever has.
- [x] Ascendance 900 -> 1600. It was a win button every forged tribe inherited.

Roster now: Auren 32, Nerivane 30, Valkyra 28, Sunwei 25, Vessari 25, Dravok 23,
Kharzul 21.5, Mycelon 20. Spread 30, from 46 at the start of the session.

- [ ] PARKED — Kharzul (21.5% mean, the mildest outlier left). Three hypotheses
      tested and all three refuted: trade ratio (0.97, but Vessari trades at 0.64
      and wins 25%), damage multiplier (ten-point cliff between 1.20 and 1.25,
      nothing lands on 25), unit cap (a horde exemption of +1 and +2 per city
      changed NOTHING — every tribe finishes with 5-8 spare capacity, so the cap
      was never binding). What remains: Kharzul takes 2.00 cities per match, the
      fewest of any tribe, and its Bloodforge path counts BATTLES WON rather than
      cities taken — the AI is being asked to farm fights instead of take ground
      and is doing exactly that. AI-behaviour work, same box as the parked aiPro
      project. Do not sweep it again.
      UPDATE: Bloodforge switched from "win 22 battles" to "capture 4 cities".
      The rationale — that the path was telling the AI to farm fights — is
      REFUTED: ai.ts reads pathId in exactly three places (research preference,
      port building, wall building) and none of them touches targeting, capture
      or movement, so no path can steer AI aggression. Kharzul's captures went
      2.00 -> 1.98 after the switch. Shipped for design coherence and a marginal,
      more consistent balance gain (21.5% -> 23%, spread 30/40 -> 33/33), NOT
      because it changed how the AI plays.
- [ ] PARKED, for the aiPro work — victory paths barely steer the AI at all. Three
      pathId checks in ai.ts, all of them build decisions. Every combat-flavoured
      path (Bloodforge, Plunder King, Storm Legend) is therefore something the AI
      stumbles into rather than pursues. Making paths actually drive AI strategy
      is likely worth more than any further constant.

- [x] Sunwei — Great Harvest now scales to the board's RESOURCE ENDOWMENT
      (divisor 2.2) rather than a flat 15. Mean 19% -> 25%. The variance
      hypothesis that motivated it did not hold — the block-to-block gap barely
      moved — but flat integers cannot land on parity (15 -> 19%, 14 -> 23%,
      13 -> 30%) and a continuous divisor can. Caught a real bug on the way: the
      first version counted LIVE resources, which harvesting consumes, so the
      goal lowered itself toward the tribe chasing it and completion jumped to
      60%. Endowment is recorded at map generation now.
- [ ] SUPERSEDED — Sunwei. Not a weak tribe; an unreliable one. Great Harvest
      completion swings 20-37% on one seed block and 7-13% on another, a 3x
      difference no other tribe shows, and its win rate follows. Highlands is
      consistently its best map (43% / 20%) but the dominant variance is
      SEED-level, not preset-level.
      Recommended fix, precedent and all: Great Harvest asks for 15 total city
      levels and scales only with board AREA. City levels come from population,
      population comes from harvestable resources, and a resource-poor seed makes
      the goal unreachable. Tide Mastery had exactly this shape — a flat 4 ports
      made it archipelago-only — and was fixed by counting the coast the board
      actually has. Great Harvest should count the board's actual harvestable
      resources the same way. Measure before shipping.

## Parked — secret fatalities (v1.1 candidate)

- [ ] PARKED. Secret input that upgrades a fatality, plus a one-time hint.
      Design is settled; only the build is deferred. Parked because it is not on
      the launch path, and because the input is exactly the kind of thing worth
      watching a tester FAIL to discover before committing to it.

      THE SHAPE. The secret must not summon a fatality — it upgrades the one
      you were already getting. Qualifying moment fires, the camera starts its
      push-in, and an input entered during that beat branches into an elaborate
      version instead of the standard one.

      Why that shape and not "a secret tap sequence":
        - Sunder is played by tapping tiles, so every tap is already a game
          action. Mortal Kombat had a d-pad sitting idle during the victory
          pose; we have no idle input surface, and a mis-entered code would
          move a unit. The cinematic window is the ONLY moment input is
          suspended — which makes it the only unambiguous place to listen.
        - Scarcity survives. Same triggers, same budget, so knowing the secret
          cannot turn a rare moment into a routine one.
        - Knowledge is rewarded with something BETTER, not something MORE,
          which is the healthier incentive.
        - The push-in becomes the "FINISH HIM" prompt for free.

      NOT Mortal Kombat choreography. We have no skeletal animation — "skeleton"
      in characters.ts means a shared MESH TEMPLATE, and units are ~6 primitive
      types on a transform node. They translate and rotate as rigid bodies; they
      cannot articulate a limb. Real MK-style moves would mean rigging 15+ unit
      types and authoring per-victim choreography, which is the combinatorial
      content problem the whole in-style approach exists to avoid, and it would
      be the only part of the game not made of flat-shaded primitives.
      Escalate with camera, timing and the board instead: desaturate everything
      but the two units, crack the tile and drop the unit through it, a hard
      slow-motion beat before impact, the killer's banner colour bleeding
      outward. Also keeps the age rating where it is.

      NOT behind a paywall. Three reasons, in order of weight:
        1. It charges for our own distribution. The secret and the shareable
           still ARE the marketing; gating them means the thing that spreads
           the game only spreads among people who already paid.
        2. "Discover the hidden thing -> now pay for more of it" is a
           bait-and-switch SHAPE, and players react to shape rather than to the
           letter of a policy. Our positioning is the opposite of that, and the
           Polytopia complaints research says paid gating is the loudest
           grievance in the genre's biggest game.
        3. v1 ships with no purchases on iOS at all, so it could not ship
           anyway, and monetizing a feature before one player has used it is
           guessing.
      If it is ever sold: a cosmetic VARIANT (a tribe's signature execution)
      beside the skins, never a better tier, and never the secret itself.

      THE DISCOVERABILITY PARADOX. A true secret is invisible to everyone who
      does not read Reddit, and nobody watches you play Sunder the way they
      watched an arcade cabinet. So make it a mystery, not a secret: the first
      time a player reaches a qualifying moment, show a one-time hint that
      something more was possible, without saying what, and never show it
      again. A secret nobody knows exists generates nothing.
