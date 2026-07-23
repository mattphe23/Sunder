# Memory

- React 19 StrictMode double-mount guarded via startedRef in GameCanvas.

## v15 graphics pass — progress (CURRENT)
DONE in scene.ts:
- DefaultRenderingPipeline: FXAA, bloom, ACES tone mapping, contrast/exposure lift, subtle vignette
- ShadowGenerator on sun light (blur exp shadows); addShadows(m, receiveOnly?) helper;
  tiles receive-only, decor + unit meshes cast+receive (wired at both buildUnitMesh return sites)
- waterMat(deep) for water/ocean tiles + emissive shimmer pulse loop
- animateMove upgraded: arc hop (dist-proportional lift, 16f) + squash&stretch (22f)
- hitFlash(unitId): clones mats, white emissive 130ms, restores (no shared-cache leak)
GameCanvas.tsx: hitFlash wired in combat event (defender + attacker-on-retaliation, 120ms delay)
pnpm check clean; menu screenshot renders fine.
TODO v15 remaining:
1. Heal shimmer visual: sfx event has no position; add optional x,y to sfx payload at heal site
   (state.ts line ~310 `{type:"sfx",name:"heal"}`) and spawn a rising green sparkle at (x,y)
2. In-game visual verify (start game, move unit, attack) via browser; FPS sanity on 13x13
3. Screenshots + checkpoint v15 + deliver
NOTE: killed tsc/pnpm watch processes to relieve OOM pressure; dev server unaffected.
Roadmap after v15: v16 heroes+share links, v17 living map+asym wins+Impossible AI,
v18 fullstack online MP, v19 share cards+forge presets+lore hovers.
- Deep Babylon imports to keep bundle small; side-effect import for StandardMaterial usage where needed.
- Use thin instances or merged meshes if tile count perf becomes an issue (11×11 fine with plain instances).

## Status (Phase 7: polish/finalize)
- Game implemented: mapgen, rules, state store, AI, Babylon renderer, React HUD/menu.
- Headless sim passes (scripts/simulate.mts). TypeScript clean.
- Dev URL: https://3000-ibwfu4o5tjjl9q88aaki4-bac726ec.us2.manus.computer

## Key files
- client/src/game/core/{types,mapgen,rules,state,ai}.ts — engine
- client/src/game/render/scene.ts — Babylon renderer (BoardRenderer)
- client/src/game/{GameCanvas.tsx,useGame.ts,ui/Hud.tsx,ui/Menu.tsx} — UI
- Assets uploaded: logo /manus-storage/logo_c79c0f53.png, menu bg /manus-storage/menu-bg_b1164e9a.png

## Verified in browser (2026-07-22)
- Full loop works: select unit (panel + torus + reachable highlights now visible after
  z-fighting fix: rings lifted +0.08, disableDepthWrite, zOffset -2), move animates,
  research panel opens/researches (Hunting), End Turn runs 3 AI turns (~2s), AI trains
  units/captures cities/eliminates player, DEFEAT screen with rankings + Play Again renders.
- Camera now centers on human capital at start (radius 13).
- NOTE: browser tool clicks at scaled coords work for DOM buttons but exact canvas unit
  picking needed synthetic events; human users clicking directly is fine (POINTERTAP works).
- Game balance: idle player eliminated by turn 7 on normal — AI is aggressive/competent.

## Design (Isoglow)
- Indigo void #141433, glass panels, amber #ffb938 accent; tribes: Auren blue, Kharzul red,
  Sunwei amber, Vessari violet. Improvements: fair factions w/ passives, scaling tech costs,
  capital-capture win, 30-turn score fallback, competent AI, fair spawns.

## Remaining before delivery
1. Verify full gameplay loop in browser (move, attack, capture, research, train, game over).
2. Mobile viewport check + representative screenshots w/ style review.
3. Save checkpoint, deliver with manus-webdev:// attachment. Research docs already delivered.

## V2 features (combat juice / fog / naval) — Jul 22
- Checkpoint v1 = c63c25b5 (delivered). Building v2 per user request (all 3 suggestions).
- DONE code: combat FX (showDamageNumber, lungeUnit, starBurst in scene.ts; wired in GameCanvas
  via "combat"/"captured" events which now carry ax/ay/dx/dy), fog depth (isVisibleTo in rules.ts;
  tile/decor visibility 0.45 when explored-not-visible; enemy units hidden unless visible),
  minimap (ui/Minimap.tsx, canvas, auto-open at size>=13, in Home.tsx), naval (sailing/navigation
  techs, Tile.port, Unit.boat, PORT_COST=3, buildPort action + AI usage, embark/disembark in
  moveUnit, boat hull mesh, port pier+mast meshes, port UI in city panel).
- TS clean; headless sim passes (5 trials).
- Browser VERIFIED (Jul 22 12:53): damage numbers render (-7 red defender / -7 amber retaliation,
  billboarded, rise+fade), lunge works, capture star-burst fired on village capture ("Auren
  captured Halon!" + income +2→+3), minimap toggle opens/closes and shows terrain/cities/units
  with fog dim, port pier renders on water tile, unit embarks (hull under unit) with log msgs,
  AI turns run cleanly post-changes (turns 1→3, no console errors). Canvas toDataURL is blank
  (preserveDrawingBuffer=false) — use browser_view screenshots mid-FX-loop instead.
- window.__polyforge exposes the live store for dev testing (added in state.ts).

## v3 (save/resume + battle preview) — verification progress (Jul 22 13:42)
- state.ts: SAVE_KEY "polyforge-save-v1"; autoSave on every changed emit (playing→save,
  menu/gameover→clear); hasSave/savedSummary/continueGame (resumes AI mid-round);
  stageAttack/confirmAttack/cancelAttack with PendingAttack interface (game.pendingAttack).
- GameCanvas: first click on attackable enemy stages preview; same-target re-click confirms;
  clicking elsewhere cancels. Menu.tsx: CONTINUE button (emerald) shows tribe/turn/difficulty.
- Hud.tsx: BattlePreview panel (bottom-center, red-accent) shows both units, −dmg/−retaliation,
  kill "falls" markers, Cancel/Attack buttons. Mounted in Home.tsx.
- VERIFIED in browser: preview panel renders with −5/−5 for warrior vs warrior (seed 4242);
  confirmAttack applied exactly the previewed numbers (dmg 5, retaliation 5, pending cleared);
  reload showed "CONTINUE — Auren, TURN 2 (normal)" and restored exact state
  (turn 1, 19 stars, techs [organization,hunting], 4 units, seed 4242);
  toMenu cleared the save. TS clean. All v3 features complete.

## v4 (ruins + turn recap) — implementation status (Jul 22 13:50)
- types.ts: Tile.ruin boolean; RecapEntry {kind: combat|capture|cityLost|ruin|fallen, text, tribe};
  GameState.recap: RecapEntry[], GameState.showRecap: boolean.
- mapgen.ts: ~1 ruin per 25 tiles (min 2), on empty land, ≥3 manhattan from cities, ≥4 from other ruins.
- state.ts: exploreRuin(u) in moveUnit — seeded roll: <0.5 → 5-9 stars, <0.8 → free eligible tech
  (fallback 6 stars), else free warrior at freeSpotNear (fallback 6 stars); logs + recordRecap.
  recordRecap skips human-tribe actors, caps 12 entries. beginTurn sets showRecap for human when
  recap non-empty. dismissRecap() clears. attack/captureCity/checkElimination record recap entries.
- scene.ts: ruin rendered as gray 4-sided obelisk + emissive amber capstone ("ruin-glow" mat) + stump.
- ai.ts: ruins within dist 6 added as objectives (w 85 - dist*6).
- Hud.tsx: TurnRecap modal ("While you were away…", icon per kind, tribe-color left border,
  "To battle" dismiss). Mounted in Home.tsx after BattlePreview.
- VERIFIED (browser, seed 4242, humanTribe opt key NOT "faction"): 2 ruins placed at (10,2),(5,3);
  stepping on (5,3) → ruin cleared, free Warrior spawned, log msg, recap NOT polluted by human event;
  after end-turns recap panel appeared: "While you were away… Vessari captured Lirath" with
  tribe-color border + To battle dismiss worked; dismissRecap cleared recap. Ruin obelisk renders
  (gray-violet pillars visible dimmed at map edge (10,2), explored fog dim correct). TS clean.
- NOTE: window.__polyforge.newGame takes { humanTribe, difficulty, size, seed }.

## v5 (great ruins + score chart) — IMPLEMENTED, needs browser verify
- types.ts: Tile.greatRuin, Unit.guardian?, GUARDIAN_TRIBE=-1, RecapEntry kind "greatRuin",
  GameState.scoreHistory: number[][]
- mapgen.ts: 1 great ruin/map (2 on ≥13), min dist ≥ floor(size*0.35) from capitals, fallback farthest
- state.ts: guardian spawn in newGame (swordsman, moved/attacked=true, never acts);
  exploreGreatRuin: 12–18 stars | tech+8 stars | veteran swordsman+5 stars; guardian-slain log/recap;
  scoreHistory snapshot in beginTurn when tribeIdx===0; updateScore guards tribeIdx<0;
  exploreAround skips tribe<0; attack recap skips guardian targets
- rules.ts: defenseBonus guardian 1.4; tribes[...]?. guards for tribe -1; reachableTiles returns [] for guardians
- ai.ts: guarded great ruin worth 95 for strong units (atk≥3) else 50; unguarded 120; +20 score to kill guardian
- scene.ts: guardian mesh (obsidian cone + amber eye + pauldrons); great ruin = gold twin obelisks +
  floating core + plinth; guardians render once explored (no live-vision need)
- Menu.tsx GameOver: recharts LineChart of scoreHistory, human line thicker, max-w-md, scrollable
- TS CLEAN. VERIFIED in browser (seed 4242, 9×9):
  * great ruin at (8,3) with guardian (swordsman, 15hp, tribe -1); gold twin-obelisk monument renders
  * guardian preview 7/7 (1.4 def bonus works); died in 2 knight attacks; "slew the Guardian" log fired
  * stepping on cleared great ruin granted Riding tech + 8 stars, tile cleared
  * scoreHistory recorded 9 rows over 8 turns; GameOver chart renders 4 faction lines w/ tooltip
  * save cleared, reset to menu. v5 DONE — delivered (checkpoint 98fa5530).

## v6 (Hall of Conquest + veterancy) — IN PROGRESS
- state.ts: recordVictory() on endByScore + checkDominationWin (human wins only);
  HALL_KEY="polyforge-hall", loadHall() export, HallEntry {difficulty,faction,turns,score,mapSize,date};
  keep best 5/difficulty sorted turns asc then score desc; game.newHallEntry flag for badge
- Menu.tsx: Hall of Conquest collapsible under Continue btn, per-difficulty tabs, empty state;
  GameOver "New Hall of Conquest record!" badge (won && game.newHallEntry)
- veterancy DONE: types.ts Unit.veteran?; state.ts promotes at kills>=3 (+5 maxHp, full heal, log, recap
  for AI units); scene.ts "crest" polyhedron (gold, spinning) above veterans w/ rebuild-on-promote;
  Hud.tsx unit panel shows kill pips (3 → Veteran) + Veteran badge. TS CLEAN.
- VERIFIED (browser, seed 777): warrior kills=2 → killed enemy → veteran=true, maxHp 10→15, full heal,
  log "promoted to Veteran"; unit panel shows Veteran; Hall of Conquest button on menu with per-difficulty
  tabs + empty state renders correctly.
- v6 DONE + delivered (checkpoint 27878c52).

# v7 IN PROGRESS: City walls + Match statistics
- types.ts DONE: City.walls?, WALL_COST=5, WALL_DEFENSE_BONUS=2.0, TribeStats interface + emptyStats(),
  GameState.stats: TribeStats[]
- rules.ts DONE: defenseBonus returns WALL_DEFENSE_BONUS when city.walls (overrides freeSpirit 1.6/1.3)
- state.ts DONE: buildWalls(cityId) (level>=3, WALL_COST stars, walls torn down on capture);
  bumpStat() helper (guards legacy saves); stats tracked: starsEarned (income+ruins), battlesWon/unitsLost
  (attack both directions), ruinsClaimed, citiesCaptured, techsResearched; stats init in newGame+emptyState
- ai.ts DONE: walls high-level cities (capital first) when stars > WALL_COST+6, 60% chance
- scene.ts DONE: rampart ring (4 wall segments + 4 hex towers, #a8a5b8) around walled city tiles
- Hud.tsx DONE: Build Walls button (level>=3, WALL_COST★), "Walled" badge, level hint; imports WALL_COST
- Menu.tsx DONE: Match statistics table on GameOver (6 rows × 4 tribe columns, human column bold+ringed)
- VERIFIED in browser: buildWalls deducted 5★ + log "Fenwick raised city walls!"; wall rampart visible
  around capital; previewCombat withWalls dmgToDef 4 vs noWalls 5, retaliation 6 vs 5 (bonus works);
  stats tracked correctly (battlesWon/unitsLost/starsEarned/citiesCaptured/techsResearched); game-over
  screen shows stats table + score chart + hall record. TS clean. v7 DONE — checkpoint 42f3bb74 delivered.

## v8 (current): catapult siege + onboarding tutorial
- Catapult ALREADY EXISTED in types.ts (cost 8, atk 4, def 0, move 1, range 3, no dash, tech mathematics)
- rules.ts DONE: defenseBonus(s, defender, attacker?) — attacker.type==="catapult" ignores WALL_DEFENSE_BONUS
- types.ts DONE: mathematics desc mentions siege trait
- scene.ts DONE: catapult mesh = tribe-colored base frame + wood arm (rot x -PI/5) + boulder + 2 wheels
- ai.ts DONE: rivalsWalled => research path hunting→forestry→mathematics; 50% train catapult; +10 attack
  score vs walled-city defenders
- Ranged no-retaliation already works via dist > defender range in previewCombat
- Tutorial.tsx DONE + mounted in Home.tsx. VERIFIED: welcome card shows on fresh profile, "Let's go"
  advances, selecting warrior advances, moving advances to Claim Villages, "Got it" → Research step,
  research("hunting") → End Turn step, endTurn → done flag "1" set, overlay gone. Skippable via X/Skip.
- Catapult VERIFIED: previewCombat catVsWalls dmg 11 identical to catVsNoWalls (walls ignored),
  warrior vs same walled defender only 3 dmg + 6 retaliation; enemy warrior vs catapult in open = 10 dmg
  kill (def 0 fragility). Catapult mesh (frame/arm/boulder/wheels) renders; unit panel shows 4 ATK 0 DEF 3 RNG.
- Note: catapult sits at (1,8) offscreen-left of camera in test; mesh existence confirmed via selection panel.
- v8 DELIVERED (checkpoint 658d0ae5). User then requested v9: map presets + undo move.

## v9 status
- mapgen.ts DONE: MapPreset type ("continents"|"archipelago"|"highlands"|"pangaea"), MAP_PRESETS list
  (name+blurb for menu), TUNING table, generateMap(size, seed, tribeCount, preset).
- Next: state.ts newGame opts.preset + s.preset field (types.ts GameState) + persistence (JSON serialize
  covers it automatically), undo snapshot (lastMove: unitId, fromX, fromY, movedBefore; cleared on
  attack/capture/train/harvest/endTurn/ruin trigger), undoMove() action; Menu.tsx preset selector row
  (uses MAP_PRESETS); Hud.tsx Undo button in BottomBar when game.canUndo().
- Key facts: state store class GameStore, autoSave via SAVE_KEY "polyforge-save-v1" JSON of full state;
  newGame(opts {size, humanTribe, difficulty, seed?}); moveUnit at ~line 448 handles ruin triggers via
  exploreRuin/exploreGreatRuin (undo must be blocked if move landed on ruin/greatRuin or captured);
  window.__polyforge dev hook exists. Tutorial flag "polyforge-tutorial-done", hall key "polyforge-hall".
- DONE so far: mapgen presets + TUNING; types.ts GameState.preset: string; state.ts newGame accepts
  opts.preset (MapPreset import), sets s.preset, emptyState preset:"continents"; undo implemented in
  state.ts: private lastMove {unitId, fromX, fromY, boat, attacked} set in moveUnit (human only, dest
  not ruin/greatRuin/city tile), cleared in endTurn/attack/captureCity; canUndo()/undoMove() public.
  Menu.tsx: World type selector (MAP_PRESETS grid, sky-blue accent), preset passed to newGame.
- v9 DONE + VERIFIED (browser): Hud.tsx Undo button added (Undo2 icon, sky accent, shows when
  game.canUndo()). Menu World-type selector renders (4 presets, sky-blue accent). Preset terrain
  distributions distinct on seed 777: continents w10/o15/m19, archipelago w17/o17/m5, highlands m59,
  pangaea w7/f34. Highlands capitals all on grass (playable). Undo verified: move→undo restores
  pos+moved=false, button disappears after use; attack & endTurn clear undo; TS clean.
- REMAINING: clear test localStorage (polyforge-save-v1, polyforge-tutorial-done, polyforge-hall),
  reload to menu, checkpoint, deliver.
- Note: reachableTiles returns {x,y} coords — map to s.tiles[y*size+x] for tile fields.
- Store on window.__polyforge (dev). Save key "polyforge-save", hall key "polyforge-hall".
- HUD: Hud.tsx panels (unit/city/tech/BattlePreview/TurnRecap), Menu.tsx (MainMenu/GameOver), Home.tsx mounts all.
- Test tip: reload page first, then `const mod = await import('/src/game/core/state.ts');
  window.__g = mod.game;` newGame({size:11,humanTribe:0,difficulty:'normal',seed:12345});
  human warrior id=1 at (9,7).
- After testing: save checkpoint, deliver with manus-webdev:// attachment.

## v10 DONE (637e6d81): faction-unique units, all verified
- arcanist(Auren, heal +2 adj at turn start), berserker(Kharzul, +50% vs wounded),
  warden(Sunwei, free mtn move + strong mtn def), raider(Vessari, +2★ plunder/kill)
- UNIT_STATS entries have `faction?: number` + `perk?: string` fields.
- Sandbox was reset; new preview URL https://3000-i6ec6uow94ogf0k6buvye-ab5232aa.us2.manus.computer

## v11 DONE: faction intro cards — VERIFIED
- FactionIntro.tsx (z-50 overlay, faction-colored, lore + passive + unique unit + 3 openings,
  "To battle" dismiss), mounted in Home.tsx after Tutorial (renders above tutorial's z-40).
- types.ts GameState.showIntro?: boolean; state.ts newGame sets showIntro=true, dismissIntro()
  clears; persisted via autoSave JSON so Continue never re-shows after dismissal but mid-intro
  reload re-shows. tribe.color / tribe.passiveDesc field names confirmed correct.
- Verified in browser: Auren + Vessari cards, dismiss, persistence both directions. TS clean.

## v12 IN PROGRESS: sound + hot-seat + achievements (v11 = ce763395)
- Preview URL: https://3000-i6ec6uow94ogf0k6buvye-ab5232aa.us2.manus.computer
- MUSIC generated + uploaded: /manus-storage/menu-theme_ab3abdad.mp3 (117s ambient loop)
- sound.ts DONE: SoundEngine class, synth SFX (click/attack/catapult/capture/plunder/heal/ruin/turn/
  promote/victory/defeat), playMenuMusic/stopMenuMusic w/ fade, kick() for autoplay, muted persisted
  "polyforge-muted", onChange listeners. Export const sound.
- state.ts DONE: GameEvent union + { type:"sfx", name: plunder|heal|promote|ruin|victory|defeat|catapult };
  emits at raider plunder, human promote, human ruin explore, human arcanist heal (beginTurn),
  endByScore + checkDominationWin + human-eliminated (victory/defeat).
- SOUND DONE: GameCanvas plays attack/catapult/capture/turn + sfx events; Home.tsx music lifecycle
  (menu=playMenuMusic, game=stop) + pointerdown kick(); MuteButton.tsx in TopBar + MainMenu top-right;
  click sfx on End Turn/train/Begin Conquest. TS clean. NOT yet browser-verified.
- HOT-SEAT DONE (TS clean, NOT browser-verified yet):
  * types.ts: GameState.humanTribes?: number[], handoff?: number|null
  * state.ts newGame accepts humanTribes; isHuman via humans.includes(i); humanTribe=humans[0];
    handoff=humans[0] when >1; showIntro only when solo. beginTurn: hotseat → repoint s.humanTribe,
    set s.handoff=tribeIdx, clear recap. checkDominationWin: gameover only when ALL humans dead;
    recordVictory skips hall in hotseat, sets s.humanTribe=s.winner for GameOver "won" display.
    confirmHandoff() clears handoff.
  * Handoff.tsx: z-[60] solid full-screen "Pass the device to <Faction>" + confirm button. In Home.tsx.
  * Menu.tsx: mode toggle solo|hotseat (User/Users icons), togglePlayer 2-4 picks w/ P1-P4 badges,
    startGame() branches; hotseat GameOver shows "<NAME> WINS". Tutorial gated off in hotseat.
- ACHIEVEMENTS DONE (TS clean): achievements.ts (8 defs: first-win, flawless, three-capitals, blitz<15,
  ruin-hunter 3, guardian-slayer, plunderer 10★, hard-win; loadAchievements/evaluateAchievements,
  key polyforge-achievements). TribeStats += capitalsCaptured/guardiansSlain/starsPlundered (bumped in
  state.ts attack/capture). state.ts onGameOver() at all 3 gameover sites → game.newAchievements.
  Menu.tsx: AchievementGrid + collapsible panel (Award icon, N/8 count) under Hall of Conquest; GameOver
  shows "Achievement unlocked" banners.
- VERIFY PROGRESS (new preview URL https://3000-i6ec6uow94ogf0k6buvye-ab5232aa.us2.manus.computer):
  * Dev server restart was needed (stale Vite module graph → sound.ts/achievements.ts/Handoff.tsx 404).
  * Menu renders: mode toggle Solo|Pass&Play OK, mute button top-right OK, Achievements 0/8 panel OK.
  * Hot-seat: started 2P (Auren P1 + Kharzul P2 + 2 AI) — handoff screen "PASS THE DEVICE TO Auren"
    shows correctly with faction color + stars + confirm button.
  * v12 SHIPPED as checkpoint 19a30984 (all verified: hotseat cycle, achievements console tests, sound).

## v13 (save slots + battle forecast + mobile touch) — IN PROGRESS
- SLOTS DONE (tsc clean): state.ts SLOT_KEY polyforge-active-slot, slotKey(1)=legacy polyforge-save-v1,
  slots 2/3 = :slot{n} suffix. game.activeSlot + setActiveSlot() + slotSummaries() (null|{turn,tribeName,
  difficulty,hotseat,players}). autoSave/hasSave/savedSummary/continueGame/toMenu all slot-aware.
  Menu.tsx: 3-col slot picker between BEGIN and CONTINUE buttons; pickSlot() plays click + setActiveSlot;
  Continue reflects selected slot (saved = game.savedSummary() re-read on re-render via useGame).
- FORECAST: BattlePreview ALREADY EXISTS in Hud.tsx (pendingAttack via stageAttack→previewCombat, shows
  dmg/retaliation/falls + confirm/cancel). Phase 2 = enrich: add modifier breakdown lines (berserker
  wounded bonus, warden mountain defense, wall defense, terrain) so numbers are explainable. previewCombat
  lives in core/rules.ts (check exact export name/args before editing).
- FORECAST DONE: combatModifiers() in rules.ts (atk: forgeborn/berserker/wounded/catapult-vs-walls;
  def: embarked/guardian/walls/city/freeSpirit/forest+archery/warden-mtn/mtn/wounded). PendingAttack.modifiers
  threaded via stageAttack; BattlePreview renders amber(atk)/sky(def) chips. tsc clean.
- MOBILE DONE: scene.ts pointers.pinchPrecision=60, pinchDeltaPercentage=0.008, multiTouchPanAndZoom,
  inertia=0.75, pinchToPanMaxDistance=20. Hud.tsx: BottomBar buttons min-h-[44px] (End Turn 48px) sm:min-h-0,
  train buttons min-h-[40px], BattlePreview buttons 44px, touchAction manipulation on BottomBar.
- SLOT BLEED BUG FIXED: setActiveSlot resets in-memory game to emptyState() when playing (save stays in
  its own slot) and bumps version WITHOUT autoSave; autoSave only removes key on "gameover" (not "menu").
  First failing test was pre-HMR stale code; after page reload the full test passed:
  slot1 solo Auren normal + slot2 hotseat Kharzul·Sunwei hard coexist, continue loads correct game per
  slot, summaries correct, slot3 empty.
- v13 SHIPPED = a5b38ca1 (slots + forecast chips + mobile touch all verified).

## v14 (diplomacy + replay + daily challenge) — IN PROGRESS
- CODEBASE MAP (verified): GameState in types.ts L233 (humanTribes?, handoff?, stats: TribeStats[],
  scoreHistory). GameEvent union state.ts L18 (sfx names union). newGame(opts{size,humanTribe,difficulty,
  seed?,preset?,humanTribes?}) L184. beginTurn L250, endTurn L301, nextTribe L311. attack() L610 (raider
  plunder inside), captureCity L711, checkDominationWin L828, recordVictory ~L862 (hall skips hotseat).
  attackableUnits in rules.ts L97 (filters e.tribe===unit.tribe only — peace filter goes HERE).
  AI: ai.ts targets via attackableUnits L106 scoring; objectives loop cities (c.tribe!==tribeIdx) +
  enemy units (e.tribe!==tribeIdx) — needs isAtWar filter. GUARDIAN_TRIBE = -1 (tribe<0).
- PLAN: core/diplomacy.ts — relations: peaceUntil[a][b] (turn number), strength(s,tribe) =
  unit power + stars + cities. offerPeace(from,to) / demandTribute(from,to,amount). AI accept model:
  ratio = strength(to)/strength(from); peace accepted if AI weaker (ratio<1.15) or losing units;
  tribute paid if much weaker (ratio<0.6); one action per rival per turn (diploUsed set per turn).
  Peace blocks attack+capture between pairs (rules attackableUnits + captureCity guard + AI filters).
  AI may offer peace to human when weak → incoming offer dialog. AI-AI always war (scope bound).
  UI: DiplomacyPanel (button in BottomBar or TopBar), incoming offer modal, sfx reuse.
- Replay: record compact entries {turn,tribe,kind,text,x?,y?} appended in recordReplay() capped 2000,
  persisted in state.replay. GameOver "Watch Replay" → ReplayViewer overlay: prev/next/autoplay,
  event feed + tile highlight via scene (bounded scope — no full time travel).
- Daily: seed = YYYYMMDD number; newGame accepts seed (already!). Daily = fixed faction (dateHash%4),
  difficulty normal, size 11, preset by hash. Menu Daily Challenge card; result recorded once per day in
  polyforge-daily-v1 {date,score,outcome,victory}; Hall shows daily entries; repeat = practice (not saved).
- v14 PROGRESS:
  * DONE: core/diplomacy.ts created (strengthOf, atPeace/setPeace/peaceTurnsLeft, diploUsed/markDiploUsed,
    grudges, aiAcceptsPeace ratio>1.4 refuses, aiPaysTribute ratio<0.6 pays TRIBUTE_AMOUNT=5,
    aiWantsPeaceWith ratio<0.55, PEACE_TREATY_TURNS=6). types.ts: GameState += peaceUntil?, diploUsed?,
    grudges?, incomingOffer?, replay?: ReplayEntry[], dailyDate?; ReplayEntry type added.
  * NEXT: state.ts store actions offerPeace(to)/demandTribute(to) + respondToOffer(accept); enforce peace
    in rules.ts attackableUnits (skip atPeace pairs; import diplomacy) + captureCity guard + breaking =
    addGrudge + clear peace; AI: filter ai.ts targets/objectives for atPeace; aiWantsPeaceWith check at
    AI turn start → s.incomingOffer={from,to:human} pause? NO — simpler: set incomingOffer, human resolves
    at their turn start (non-blocking for AI). recordReplay() in state helpers + hook attack/capture/train/
    tech/move(skip move? too noisy — only combat/capture/train/tech/diplo/turn); ReplayViewer UI; Daily.
  * UI todo: DiplomacyPanel (TopBar button opens rivals list w/ strength hint + Offer Peace / Demand
    Tribute buttons, one action per rival per turn), incoming offer modal at human turn start,
    GameOver Watch Replay button, Menu Daily Challenge card + Hall daily entries.
  * SCOPE EXPANDED by user mid-task: + weekly challenge (week seed, BEST score across attempts kept,
    attempts counter), + 2 new tribes (Nerivane teal tide / Ordovai slate ancient, passives + unique
    units, update ALL tribe-count-4 assumptions: mapgen capitals spacing, menu grid, hotseat picker,
    FactionIntro INTROS, scene colors, TRIBE_DEFS len), + custom tribe forge (name/color/passive/perk
    from existing parts, persisted polyforge-custom-tribe-v1, excluded from daily/weekly).
  * Custom tribe design decision: TRIBE_DEFS stays static for the 6 built-ins; custom tribe implemented
    as OVERRIDE at newGame time — replace tribe slot 0's def fields (name/color/passive) via opts.custom;
    unique unit faction check needs mapping custom→chosen perk unit (store chosen unit type on Tribe).
  * ROADMAP LOCKED (user): v14 (diplo+replay+daily/weekly+2 tribes+forge) → v15 graphics pass
    (DefaultRenderingPipeline bloom/tonemap/FXAA, soft shadows, SSAO if perf, water shimmer, unit hop/
    hit flash/dmg numbers/capture burst) → v16 (hero units w/ XP+perk choice, link-shareable challenges
    ?c=seed.preset.size.faction&score=NNN no backend) → v17 (living map: barb camps/storms/awakening
    guardians seeded-deterministic; asymmetric per-faction win paths). All in todo.md.
  * + v18 ONLINE MULTIPLAYER (user: "must have"): full-stack upgrade (web-db-user), async turn-based
    matches, real daily/weekly leaderboards. User will get back on monetization + identity/name later.
    Design v16 share-links so they can plug into v18 leaderboards.
  * + IMPOSSIBLE AI added to v17 (user): 4th tier, smarter-not-richer (threat maps, task forces,
    2-3 turn lookahead, econ optimizer, faction-aware play, ~no star cheats). Separate brain module
    selected by difficulty; existing easy/normal/hard unchanged. Hall tracks Impossible separately.
    Post-v18 idea: Impossible win-rate leaderboard.
  * + COALITIONS (user brainstorm): v14 gets AI↔AI truces vs common enemy (score leader) + human
    "gift stars" action (3★, clears grudge/biases acceptance). v17 Impossible gets full coalition
    coordination (staggered attacks, target dedup, opportunistic betrayal). Balance: coalitions punish
    leader — counterplay = tribute/gifts to peel members off.
  * DIPLO CORE COMPLETE (tsc clean): rules.ts attackableUnits+captureCity peace guards; state.ts actions
    canDiplo/offerPeace/demandTribute/respondToOffer/giftStars/relationWith + recordReplay hooks (turn/
    combat-kill/capture/train/tech/diplo); ai.ts runAiTurn: losing AI sues peace (sets s.incomingOffer),
    coalition truces vs leader (1.5x threshold), objective peace filters; sound.ts "treaty" sfx.
  * NEXT: Diplomacy UI in Hud.tsx (TopBar Diplomacy button → rivals panel using relationWith/canDiplo,
    Offer Peace / Demand Tribute / Gift 3★ buttons w/ response toasts via sonner or inline), incoming
    offer modal (s.incomingOffer, respondToOffer) — render in Home.tsx like other overlays, must show
    at human turn start; treaty badge (dove/peace icon + turns left) near rival scores if visible.
    THEN phase 2 replay viewer UI (GameOver "Watch Replay" → step feed w/ prev/next/autoplay).
  * DIPLO UI DONE (tsc clean): ui/Diplomacy.tsx = DiplomacyPanel (rivals, strength label, 3 actions,
    inline toast) + IncomingOfferModal (gated to human's own turn). Home.tsx mounts both; BottomBar
    has Bird "Diplomacy" button (onOpenDiplo). PHASE 1 COMPLETE pending browser verify (do in phase 6).
  * NEXT: PHASE 2 replay viewer — s.replay entries exist (turn/combat/capture/train/tech/diplo kinds,
    recordReplay caps 2000). Build ui/Replay.tsx: GameOver "Watch Replay" button → overlay stepping
    through entries (prev/next/autoplay 1.5s, turn grouping, tribe colors), reuse panel style.
  * DIPLO STATE.TS DONE: imports diplomacy.ts; GameEvent sfx += "treaty"; newGame inits peaceUntil/
    diploUsed/grudges/incomingOffer/replay; recordReplay() capped 2000; canDiplo/offerPeace/demandTribute/
    respondToOffer/relationWith actions. rules.ts attackableUnits has peace filter.
  * STILL NEEDED for diplo: sound.ts add "treaty" SfxName synth; emptyState() add diplo fields (NOT yet);
    captureCity peace guard (block capturing cities of at-peace tribes? DECISION: yes, guard in
    captureCity); breaking-peace path (attack impossible while at peace, so breaking = N/A unless we add
    "declare war" — grudges apply if we later allow break; keep addGrudge import used or remove);
    AI: ai.ts filter targets (attackableUnits already filters) + objectives (cities/units of at-peace
    tribes) + aiWantsPeaceWith check in runAiTurn start → sets s.incomingOffer for human; beginTurn
    replay "turn" entries + attack/capture/train/research recordReplay hooks; Hud diplomacy panel UI +
    incoming offer modal; GameOver Watch Replay.
- Key API notes: game.subscribe((e) => ...) returns unsub; combat event has attackerId (look up
  s.units.find for type==="catapult" for catapult sound — may be dead, check defenderDied/attackerDied);
  Menu.tsx has MainMenu + GameOver; Hud.tsx has TopBar (top-left pill) + BottomBar.
- humanTribe currently single number s.humanTribe; hot-seat needs humanTribes: number[] approach —
  keep s.humanTribe as "current human" pointer to minimize refactor; isHuman flag on Tribe exists.
  * PHASE 2 REPLAY DONE (tsc clean): ui/Replay.tsx = ReplayViewer (prev/next/autoplay 900ms, progress
    bar, turn dividers, tribe-color entries, auto-scroll). GameOver (Menu.tsx) has "Watch Replay" btn
    (shown when s.replay non-empty) + mounts <ReplayViewer>. recordReplay hooks verified: turn markers,
    combat kills, captures, tech, train, all diplo actions. Browser-verify in phase 6.
  * NEXT: PHASE 3 daily+weekly challenges. Plan: mapgen needs seeded RNG (check mapgen.ts for rng use);
    challenge modes = fixed seed from date (UTC day / ISO week), fixed faction+preset+size+difficulty
    derived from seed; menu "Challenges" section w/ Daily & Weekly cards; scores saved to
    localStorage polyforge-challenge-v1 {daily:{seedKey,score,date},weekly:{...best-of-week}};
    Hall of Conquest gets challenge tab or separate list; weekly = best score across attempts.
  * PHASE 3 CHALLENGES DONE (pending tsc + browser verify): core/challenges.ts = dailyChallenge()/
    weeklyChallenge() (FNV-1a hash of period key → seed; daily=11px/normal/UTC-day, weekly=13px/hard/
    ISO-week; preset+faction rolled from seed; resetsIn countdown), recordChallengeScore keeps period
    BEST + attempts in localStorage polyforge-challenges-v1. state.ts: newGame accepts challenge?:
    ChallengeKind, onGameOver records score (base + (maxTurns-turn)*25 win speed bonus) →
    game.newChallengeBest; recordVictory skips Hall for challenge runs. types.ts: GameState.challenge
    (replaced stale dailyDate). Menu.tsx: 2-card Challenges grid above Hall (label/faction/preset/
    size/difficulty/best/attempts/resets-in), startChallenge() passes fixed seed; GameOver shows
    cyan "New best" / muted "below best" banner via currentScore().
  * NEXT: PHASE 4 two new tribes (roster → 6): pick names/colors/passives/unique units; touch
    types.ts TRIBE_DEFS + FactionPassive + UnitType (2 new uniques + UNIT_STATS w/ faction: 4,5),
    rules.ts (passive hooks + unique rules), state.ts (unique behaviors like arcanist/raider),
    ai.ts (unique usage), scene.ts (2 new unit meshes + tribe colors OK), FactionIntro.tsx lore,
    Menu grid (grid-cols-2 → handles 6 fine), challenges faction roll 4→6. NOTE: TRIBE_DEFS is
    `as const` — check newGame maps over TRIBE_DEFS.length everywhere; mapgen capitals use
    tribeCount=TRIBE_DEFS.length → 6 capitals need map space; consider keeping 4 tribes per match
    (pick 4 of 6) to avoid crowding — YES: matches stay 4 tribes; the roster is 6 choices.
    Plan: newGame gains `roster?: number[]` (4 tribe-def indices, default [0,1,2,3]); tribes built
    from roster; humanTribe = position in roster. Solo menu: pick any of 6 → roster = chosen + 3
    others (random or fixed). Hot-seat: players pick from 6, fill AI from rest. Keep tribe.index =
    slot position (existing logic safe), add tribe.defIndex for lore/uniques mapping.
  * PHASE 4 NEW TRIBES — progress: types.ts DONE (TRIBE_DEFS now 6: +Nerivane #2dd4bf teal
    passive tideborn "ports cost 1★, boats move +1" startTech sailing; +Dravok #a8763e ochre
    passive stonebound "walls cost 2 less, city defenders +10% def" startTech shields;
    UnitType +tidecaller (6★ hp10 atk2.5 def1.5 mv2 dash, faction:4, swims shallow water,
    +30% atk from water) +bulwark (6★ hp18 atk1.5 def3 mv1 no-dash, faction:5, adjacent
    allies −20% dmg); FactionPassive +tideborn+stonebound). rules.ts DONE (tidecaller water
    moveCost 1, bulwarkShielded() exported helper, previewCombat dmg reduction + water atk
    bonus, combatModifiers chips, stonebound city def ×1.1). scene.ts DONE (tidecaller mesh:
    capsule+glow fin+trident; bulwark mesh: box+slab shield+merlons).
  * PHASE 4 REMAINING: (a) state.ts: tideborn PORT_COST→1 & boat move +1 (BOAT_MOVEMENT in
    rules.ts reachableTiles: `unit.boat ? BOAT_MOVEMENT + (tideborn?1:0)`), stonebound
    WALL_COST→3 in buildWalls + Hud wall button cost display; check Hud shows PORT_COST/
    WALL_COST constants directly (grep in Hud.tsx). (b) DECISION MADE: matches stay 4 tribes,
    roster of 6 choices. newGame gains roster?: number[] (4 def-indices, default [0,1,2,3]);
    tribes built from roster def; humanTribe = roster position. generateMap(tribeCount=4)
    unchanged. Tribe gains defIndex field (types.ts) for uniques/lore. UNIT_STATS faction:
    4/5 = DEF index → trainableUnits must compare vs tribes[tribe].defIndex (rules.ts:247)
    and ai.ts:104 same. arcanist/berserker etc faction 0-3 also become def-indices — OK since
    default roster keeps positions equal. challenges.ts faction roll stays 0-3 core (fine) or
    extend to 6 w/ roster incl. picked. (c) Menu.tsx: solo grid maps over 6 TRIBE_DEFS,
    faction=defIndex; roster = [picked, ...3 random others]; hotseat: players pick defIndices,
    map to roster. FactionIntro.tsx INTROS indexed by defIndex (add 2 entries: Nerivane lore
    tide-folk of drowned coast cities; Dravok stone-forged caravan folk of the ochre canyons).
    (d) ai.ts unique check uses defIndex; AI trains tidecaller near water, bulwark for defense.
    (e) sound: no new sfx needed. (f) tsc + verify in phase 6.
## v15 note — perf verification
Sandbox browser uses SwiftShader (software GL) → 4-5 FPS with full pipeline; NOT representative
of real hardware GPUs. Mitigation added: adaptive quality in scene.ts — detects software renderer
via WEBGL_debug_renderer_info and monitors sustained FPS; drops bloom+shadows+vignette when
renderer is software OR fps stays under 24 for ~4s. Real-hardware verification advised to user.

## Rebrand (post-v15, user decision)
- Game is now **Sunder: The Living Forge**; world/setting is **the Shatterlands**. House line: "Forge your tribe. Sunder the Shatterlands."
- New logo: /manus-storage/sunder-logo_2cc0d47d.png (sundered crystal with forge-fire crack, transparent). Old Polyforge logo retired.
- localStorage keys deliberately KEPT as polyforge-* (save compat); window.__polyforge test handle kept too. Only user-facing copy + comments rebranded.
- Rejected names: Pocket Empires (baggage/casual), Warforge (D&D collision), TinyReign (casual signal). Shatterlands repurposed as the world name.

## Brand sheet adoption (user-approved v2 sheet at /home/ubuntu/upload/2D4B2717-A1D1-4DEF-8043-0C7C1F50B600.png)
- Official mark: faceted stone mountain-peak silhouette enclosing an anvil, molten orange sun-core glowing above; cream/ivory facets, ember glow. Replaces sundered-crystal logo.
- Official wordmark: chiseled "SUNDER" — heavy angular slab caps with notches cut into letterforms, cream stone; sub-line "— THE LIVING FORGE —" amber caps.
- Tagline: "BUILD. CONQUER. REFORGE." (cream/orange/teal). Campaign line: "OUTTHINK. OUTFORGE. OUTLAST."
- Values: Forge / Conquer / Reforge. Palette: cream, gold #e8a33d-ish, ember, teal, emerald, slate navy.
- Sheet extras (Forge Core/Hall/Watchtower buildings, volcanic/coast biomes) = roadmap concepts, not shipped; volcanic biome earmarked as first paid map expansion.
