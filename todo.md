# Sunder: The Living Forge — Project TODO

History note: v10–v13 granular plans (all verified complete) are preserved in git history of this
file. This version consolidates the audit done after the v19 checkpoint (7d70bcb0): every item
below was checked against the actual codebase before being marked.

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
- [ ] v40-prep: headless AI-vs-AI batch simulation script with score collection
- [ ] v40-prep: balance report from AI match batch results
