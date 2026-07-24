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
- [ ] Verify live production site serves the latest version
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
- [ ] Confirm the live production site serves checkpoint a43b9884 (v24 fog fix + graphics)
