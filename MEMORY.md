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

## v16 progress notes (working)
- DONE: hero engine (types.ts: hero UnitType, HERO_PERKS 8 perks, HERO_XP_THRESHOLDS [6,10,14], max lvl 4, HERO_NAMES [Maelis,Drukhar,Wu Jian,Szara,Nereth,Borvak]); rules.ts perk modifiers (warlord/ironskin/swift/inspiring/warding auras); state.ts spawn near capital via nearestFreeLand, grantXp (kill+3, capture+4, ruin+2, battleWon+2), human→pendingPerk modal, AI auto-pick seeded, perkChoices seeded 3 options, choosePerk; hero mesh in scene.ts (caped cylinder, banner pole+flag, spinning molten crown torus, level pips); PerkChoice modal + hero panel in Hud.tsx, mounted in Home.tsx; levelup sfx in sound.ts. All verified in browser: spawn(4 heroes), human levelup modal, warlord modifier shows in preview, AI auto-picked "swift".
- DONE: challenges.ts friend-challenge module: encodeFriendChallenge/decodeFriendChallenge (URL-safe b64, pipe payload name|score|seed|preset|size|difficulty|tribe|won|turns + hash checksum %9973), friendChallengeUrl, readFriendChallengeFromUrl (?c= param).
- TODO: Menu.tsx integration: (a) MainMenu read ?c= → show challenge banner card → start game with friendChallenge state (b) GameOver share button: builds FriendChallenge from s (name prompt/localStorage "polyforge-player-name"), copies URL via navigator.clipboard, uses defIndex of human tribe (c) GameOver friend-challenge result comparison (beat score or not) using s.friendChallenge.
- Menu.tsx structure: MainMenu ~line 84 (startChallenge line 142 uses g.newGame with challenge kind), GameOver line 501 (winner banner ~line 534-551 challenge pill area is where friend result pill goes; share button near "PLAY AGAIN" buttons at end of GameOver after stats table).
- GameState additions already in types.ts: pendingPerk?: number|null; friendChallenge?: {name,score,seed,preset,size,difficulty,tribe} | null. NOTE: FriendChallenge iface in challenges.ts also has won+turns; GameState.friendChallenge type is narrower — keep only needed fields when storing.
- newGame opts don't include friendChallenge yet — add opts.friendChallenge and set s.friendChallenge in newGame; scoring comparison on gameover: human score = s.tribes[s.humanTribe].score + speed bonus? For fairness use same formula as challenge scoring: base + (won ? (maxTurns - turn)*25 : 0).
- TODO after: OG image (generate 1200x630, upload via manus-upload-file --webdev, add og:image/twitter meta to client/index.html), loading splash (brand mark + OUTTHINK. OUTFORGE. OUTLAST. while Babylon inits — GameCanvas.tsx has loading state? check), full verify, checkpoint, deliver.
- Existing assets: /manus-storage/sunder-mark_d1dbf156.png (logo), /manus-storage/sunder-wordmark_36e4517b.png, /manus-storage/menu-bg_b1164e9a.png. Local originals in /home/ubuntu/webdev-static-assets/.
- v16 DONE: friend challenges verified end-to-end in browser (banner from ?c=, duel start w/ correct seed/tribe, gameover result pill "Kael still leads — 210 vs 412", share button copies link). OG meta tags added (og/twitter, image /manus-storage/sunder-og_9c622cdc.png 16:9). Loading splash in GameCanvas (logo + OUTTHINK. OUTFORGE. OUTLAST. + sweep bar, fades 700ms after first build; keyframes in index.css).

## v17 IN PROGRESS (living map + hero drama + profile)
- DONE: core/events.ts created — runWorldPhase(s, makeUnit) [camps spawn≥T5 chance .4 cap 2, grow every 2t, raid at str 3 → GUARDIAN_TRIBE(-1) warriors w/ u.raider=true; storms cap 1 chance .3 lifetime 3 drift on water, inStorm(s,x,y) export; guardians wake at T14 → u.awake=true] + worldUnitIntents(s) (raiders+awake guardians step toward nearest unit/city ≤6, attack adjacent via intents resolved in state.attack).
- DONE: types.ts — Unit.awake?, Unit.raider?; GameState.camps?, storms?, nextEventId?, worldEvents?, heroFallen? {heroName,tribeName,tribeColor,killerTribe,wasHuman,taunt}.
- DONE: state.ts — runWorldTurn() called in beginTurn when tribeIdx===0 (after scoreHistory); drainWorldEvents(). NEEDS: import events.ts fns + makeUnit is module-level fn at L1233 (sig: makeUnit(id,type,tribe,x,y)); attack() from guardians: attackableUnits may filter GUARDIAN attacks — CHECK rules.ts attackableUnits allows attacker tribe -1 (it filters e.tribe===unit.tribe so -1 attacking works, but peace guard atPeace(-1,x) — check).
- TODO next: (1) state.ts import {runWorldPhase, worldUnitIntents} from "./events"; emptyState add camps/storms/worldEvents/heroFallen/nextEventId; newGame init them. (2) rules.ts: reachableTiles block storm water tiles (inStorm) + moveUnit guard; camps block movement? camp tile impassable + attackable? camps razed by stepping: moveUnit onto camp tile → raze +5★ loot + log (simpler: camp not a unit, stepping on it destroys, guard campAt in events import in state.moveUnit). Note reachableTiles returns [] for guardians unless awake — UPDATE: allow awake guardians (currently `if (unit.guardian) return []`). worldUnitIntents does movement manually so rules change optional but attack(u.id) requires attackableUnits to include targets for guardian attacker: check attackableUnits guards. (3) hero death drama: in attack() both death sites (d.hero L~860, a.hero L~906) set s.heroFallen card w/ taunt lines (only when human involved or visible), score stake: -30 score on hero death? simpler: fallen tribe loses 15 score via updateScore penalty — store heroLost flag on tribe? Use stats.herosLost? Decision: subtract 25 stars-equiv score by adding tribe.heroFallenPenalty? — SIMPLEST: score fn subtracts 20 if tribe has no living hero and turn>1. Implement in updateScore. (4) HeroFallen.tsx card UI (z-55 overlay) + WorldEvents card (turn-start, reuse recap pattern — merge world events into recap for AI turns instead? Decision: separate WorldEventCards modal at human turn start w/ dark styling, drainWorldEvents()). (5) scene.ts: camp mesh (tents+fire glow), storm overlay (dark disc + rain lines?), awakened guardian glow eye red. (6) profile.ts: PROFILE_KEY polyforge-profile-v1 {name, games, wins, kills, heroesLost, bestScore, campRazes}; bump in onGameOver + attack; Profile panel in Menu; share button uses profile name (replace polyforge-player-name reads).
- Verify plan: seed console test — set turn to 5+, endTurn, check camps/storms in state; T14 guardian wake; hero fallen card; profile after gameover.

## v17 progress checkpoint 2
- ENGINE DONE (tsc clean): events.ts (runWorldPhase/worldUnitIntents/inStorm/campAt/eventRng), rules.ts guards (storm water impassable, camps enterable-not-passthrough, awake/raider tribe<0 can move), state.ts wiring (runWorldTurn in beginTurn tribe0, drainWorldEvents, razeCampAt in moveUnit +5 stars +campsRazedByHuman, stageHeroFallen at both death sites + tribe.heroFell, dismissHeroFallen, updateScore hero stakes +15/lvl −40 fallen, newGame inits camps/storms/nextEventId/worldEvents/heroFallen/campsRazedByHuman).
- PROFILE DONE: core/profile.ts (PROFILE_KEY polyforge-profile-v1, loadProfile migrates polyforge-player-name, recordGameResult in onGameOver solo-only: games/wins/kills=battlesWon/heroesLost/campsRazed/guardiansSlain/bestScore/fastestWin/duelsWon).
- RENDER DONE: scene.ts campMeshes/stormMeshes maps + syncWorld() called at end of syncUnits; buildCampMesh(strength: tents 2-3 + ember fire + skull totem at str3); buildStormMesh(cloud puffs + blinking bolt + slow rotation); guardian awake red eye (guardian-eye-awake mat) + rebuild on metadata.awake mismatch; raiders col #5a4a52 (tribe<0 non-guardian).
- UI DONE: ui/WorldEvents.tsx = WorldEventCards (top-center toast stack, drains on human turn start, filters stormMoved/guardianMoved, auto-fade 6.5s) + HeroFallenCard (z-55 modal, skull, taunt, −40 pill, dismissHeroFallen).
- REMAINING: (1) raider visibility rule in scene syncUnits L478 excludes tribe!==human w/o vision — raiders tribe -1: `u.tribe !== s.humanTribe` true so they need isVisibleTo — OK acceptable (fog). BUT guardians once-explored show; raiders live-vision only — fine. (2) Mount WorldEventCards+HeroFallenCard in Home.tsx. (3) Profile UI in Menu.tsx (panel w/ name edit + stats grid; use loadProfile/setProfileName; share button in GameOver already reads polyforge-player-name — profile keeps in sync). (4) AI should attack raiders/camps? attackableUnits includes tribe -1 units (e.tribe!==unit.tribe) OK. AI ignores camps (not units) fine. (5) worldUnitIntents attack path uses state.attack which requires attackableUnits(s,a) — a is raider tribe -1, e.tribe>=0, peace guard needs both >=0 so passes. Raider moved/attacked flags: reset each world phase? They don't get u.moved reset (beginTurn resets per-tribe). runWorldPhase should reset raider moved/attacked at start OR worldUnitIntents ignores flags (attack() checks attackableUnits which checks unit.attacked!). FIX NEEDED: reset moved/attacked for tribe<0 units in runWorldTurn before intents.
- Menu.tsx structure: MainMenu ~L84, GameOver ~L501; share name key polyforge-player-name.
- Verify plan: __polyforge console — newGame seed w/ turn skip via repeated endTurn? Simpler: g.state.turn=6 then endTurn cycle to trigger world phase; check camps/storms arrays; force guardian wake turn 14; kill hero via hp=1 + attack to see HeroFallenCard; gameover → localStorage polyforge-profile-v1.

## v17 verification progress (phase 5)
- tsc clean. All v17 code wired: events.ts engine, rules.ts guards, state.ts (runWorldTurn at beginTurn tribe0 L308, raider flag reset before intents, razeCampAt, stageHeroFallen both sites, heroFell score −40, profile recordGameResult in onGameOver), scene.ts (syncWorld camps/storms, awake red eye, raider #5a4a52), WorldEvents.tsx (WorldEventCards + HeroFallenCard) mounted in Home.tsx, Menu.tsx Commander's Record panel (name edit + 9-stat grid).
- VERIFIED in browser (seed 555 easy 11x11): turn 13 → 2 camps spawned & grew to str 3/2 ("The barbarian camp grows bolder…" in log), profile localStorage polyforge-profile-v1 recorded games:1 bestScore:40 after earlier gameover. Debug handle = window.__polyforge; endTurn + poll currentTribe===humanTribe && !aiThinking (AI rounds ~5-8s each).
- STILL TO VERIFY: camp raid spawns raiders (nextActionTurn 14/15 at str3 → next world phase), storms (STORM_CHANCE 0.3, none by turn 13 — check more turns), guardian wake at turn >= 14 (guardians only spawn from greatRuin? confirm map has guardian unit — check s.units guardian count), HeroFallenCard visual, camp raze (+5 stars), profile UI panel render, WorldEventCards toast visual, screenshot pass, checkpoint.
- Preview URL: https://3000-i6ec6uow94ogf0k6buvye-ab5232aa.us2.manus.computer/

## v17 verification COMPLETE (all browser-verified)
- Camps spawn+grow+raid: seed 555, turn 13 → 2 camps str3/2; turn 16 raid spawned 2 raiders; camp tents render (orange cones) once explored.
- Storm: formed turn ~15 at (2,2), drifts, "Dark clouds gather" toast. Guardian woke turn 16 (awake:true).
- WorldEventCards toasts render top-center ("THE WORLD STIRS" style, storm/guardian/raid), dismiss buttons work.
- Hero-fallen drama VERIFIED: raider killed Maelis → HeroFallenCard renders (skull, "Maelis of Auren", taunt "The Shatterlands remember only the victors." — the wilds, −40 score pill, AVENGE THEM btn). killerTribe "the wilds" for raiders. dismissHeroFallen works.
- Camp raze: warrior onto camp → +5★, "Auren razed the barbarian camp — 5★ plundered!", camp removed.
- BUGFIX in attack(): recap line s.tribes[a.tribe].name crashed for tribe -1 attackers → guarded with aTribeName (Barbarian/Guardian); also d.guardian slain log guarded a.tribe>=0. tsc clean.
- Profile: polyforge-profile-v1 records games/bestScore; menu shows COMMANDER'S RECORD 0W/1G pill. Panel UI (name edit + 9-stat grid) coded, pill verified in menu.
- Test state cleaned: back to menu, test save removed (slot key polyforge-save-v1).
- REMAINS: screenshot pass + checkpoint + delivery. Note profile counts test game (games:1 bestScore:40) — acceptable/minor; could clear polyforge-profile-v1? DECISION: clear it to give user a clean slate.

## v18 fullstack upgrade (web-db-user) — DONE via webdev_add_feature; CONFLICTS TO FIX
Template facts (from upgrade README):
- tRPC 11 + Drizzle (MySQL) + Manus OAuth baked in. Procedures in server/routers.ts, helpers in server/db.ts, schema in drizzle/schema.ts.
- DB migrate flow: edit drizzle/schema.ts → pnpm db:push (generate+migrate). Or webdev_execute_sql for SQL.
- Auth: client useAuth() from @/_core/hooks/useAuth; startLogin() from "@/const" (event handler only, NEVER render); server ctx.user via protectedProcedure; trpc.auth.me.useQuery(), logout mutation.
- Client trpc hooks: trpc.*.useQuery/useMutation from client/src/lib/trpc.ts; superjson; /api/trpc.
- Tests: vitest, server/*.test.ts pattern (see server/auth.logout.test.ts), pnpm test.
- Envs auto-injected (DATABASE_URL, JWT_SECRET, VITE_APP_ID, OAUTH_SERVER_URL, VITE_OAUTH_PORTAL_URL, BUILT_IN_FORGE_API_*).
- Notifications: server/_core/notification.ts (owner notifications only). Heartbeat SDK at server/_core/heartbeat.ts.
CONFLICTS I MUST RESOLVE NOW:
1. client/src/pages/Home.tsx — template OVERWROTE our game Home with example page. MUST restore game version (imports: useGame, GameCanvas, sound, MainMenu/GameOver, Hud components incl PerkChoice, Minimap, Tutorial, FactionIntro, Handoff, Diplomacy, WorldEvents WorldEventCards+HeroFallenCard, techOpen/diploOpen state, menu music effects) — full original JSX is in the upgrade diff above (project side of conflict).
2. package.json — keep name polytopia-clone AND @babylonjs/core ^9.17.1 dependency (template removed it, added aws-sdk).
Then: pnpm install, pnpm db:push, webdev_restart_server, regression test solo game.
Plan after: schema (profiles/matches/match_turns), server routers (profile sync, match create/join/submitTurn/list/poll), client OnlinePanel in Menu + useAuth sign-in, in-game online turn flow, guardian relic bounty, camp minimap warning.

## v18 progress (server layer DONE)
- Schema: profiles (userId unique, commanderName + 8 stat counters), matches (varchar id nanoid10, host/guest user ids+names, seed/preset/size/hostTribe/guestTribe, status open|active|finished|abandoned, turnNumber, currentUserId, winnerUserId, resultText), match_turns (matchId, turnNumber, submittedByUserId, state longtext). Pushed OK.
- server/db.ts: getProfile/upsertProfile (max-merge counters, name overwrite), createMatch/getMatch/updateMatch/listMatchesForUser(30)/saveTurnSnapshot/getLatestSnapshot.
- server/routers.ts: profile.get/sync; match.create/join/get/status(light poll)/submitTurn(validates active+currentUserId+turnNumber=m.turnNumber+1, finished→winner)/myMatches(mapped view w/ yourTurn,youWon)/abandon(concede).
- server/match.test.ts: 5 tests w/ vi.mock of ./db — all pass (6 total incl auth.logout).
- Client TODO next: profile.ts cloud sync hook, Menu OnlinePanel (sign-in via useAuth/startLogin, create/join match, My Matches list), online game flow in state.ts (serialize state, submit turn), /join/:id handling via ?m= param maybe, in-game "waiting" banner + polling via trpc.match.status.useQuery refetchInterval, then relic bounty + minimap camp warning.

## v18 online design facts (from state.ts reading)
- Hotseat = humanTribes.length>1; beginTurn sets s.handoff=tribeIdx for human tribes and clears recap. dismissHandoff at L732 sets handoff=null.
- endTurn→nextTribe: AI tribes run via setTimeout(runAiTurn,350). Human tribes just beginTurn and wait.
- newGame opts: { size, humanTribe, difficulty, seed?, preset?, humanTribes?, challenge?, roster?, custom?, friendChallenge? }.
- Save system: SAVE_KEY polyforge-save-v1 + slots; game.state serializes to JSON directly (whole GameState).
- onGameOver: solo-only profile recording gated by humanTribes.length===1.
- ONLINE DESIGN: online match = newGame with humanTribes=[hostTribe,guestTribe], both isHuman. Local player only controls their tribe; when the OTHER human tribe's turn begins (handoff fires), instead of showing HandoffScreen we: serialize state, submitTurn to server, show "waiting for opponent" overlay, poll match.status; when turnNumber advances, fetch match.get and load opponent's submitted state.
- Actually simpler: each player plays their full turn locally (AI tribes too? No—) . DECISION: 1v1 online, NO AI tribes (2 tribes only), world events still run deterministically since they happen in beginTurn(0). Whole-state snapshot per turn avoids desync.
- game store: OnlineController client-side module bridges game events ↔ trpc.

## v18 client progress
DONE:
- types.ts: GameState.online? {matchId,hostTribe,guestTribe,hostName,guestName} | null.
- state.ts newGame: accepts opts.online, roster may be length 2 (online 1v1, no AI) or 4; state.online set from opts.
- client/src/game/online/useCloudProfile.ts: cloud profile sync hook (max-merge), call from menu w/ syncKey.
- server layer + tests all done (see above).
NEXT STEPS (in order):
1. GameStore: add serializeState(): string (JSON.stringify(this.state)) and loadOnlineSnapshot(json, myTribe): sets state, ensures selected ids null, aiThinking false, humanTribe=myTribe so the local player views their own tribe; DO NOT autoSave online games into slots (autoSave should skip when s.online).
2. When online game: beginTurn hotseat branch sets s.handoff — for online, handoff for the REMOTE tribe should instead trigger "submit turn + waiting overlay". Plan: in nextTribe/beginTurn keep handoff mechanism, but new client module online/controller.ts listens for game events; when s.online && s.handoff != myTribe → serialize + submitTurn + waiting. When s.handoff === myTribe → dismissHandoff automatically (it's our turn).
   Simpler: OnlineGame React component (mounted in Home when s.online) uses useGame() and effects: if s.handoff !== null && s.online: if handoffTribe === myLocalTribe → game.dismissHandoff(); else → do submit flow, show WaitingOverlay, poll trpc.match.status (refetchInterval 5s); on turnNumber advance → trpc.match.get → game.loadOnlineSnapshot.
3. My tribe determination: role host→hostTribe, guest→guestTribe. Store myRole in component prop / lookup via trpc.auth.me + match data (hostUserId). Add to OnlineGame props from Menu.
4. Menu OnlinePanel: "Play Online" section — sign in (startLogin from "@/const"), Create Match (uses current faction/map settings; calls newGame locally w/ roster [myTribeDef, oppTribeDef]... ACTUALLY create flow: host configures, calls match.create with initialState = serialized newGame state (host plays turn 1 first? simpler: host creates, state snapshot turn 0 saved, host plays when guest joins? Polytopia async: host plays turn immediately). DECISION: host creates match + plays first turn immediately (submitTurn turnNumber1), then waits. Guest joins via ?m=MATCHID link banner (like friend challenge ?c=).
   gameover in online → submitTurn finished:true winner resultText.
5. URL param ?m= handled in MainMenu like ?c= friend challenges.
6. Turn notifications: myMatches list in menu w/ yourTurn badge (poll 30s).
7. Relic bounty: guardian slain by human → hero gains free perk choice (set pendingPerk w/ 3 relic options or grant random perk + toast). Simplest: on guardian kill, grant hero +1 level worth: stage pendingPerk for human. Find guardian kill site in attack() (bumpStat guardiansSlain).
8. Minimap camp warning: Minimap.tsx — draw camps as red dots, pulse when strength>=3.
Key APIs: game.dismissHandoff() exists (L~732 sets handoff=null + emit). trpc hooks via client/src/lib/trpc.ts. startLogin from "@/const". useAuth from "@/_core/hooks/useAuth".

## v18 phase-4 progress (online UI)
- OnlinePanel.tsx (client/src/game/online/): menu panel — sign-in CTA, CREATE DUEL (host picks faction, builds turn-0 locally, serializes as initialState), invite link /?m=<matchId>, invite banner (readMatchInviteFromUrl), My Matches list w/ YOUR TURN badges. Mounted in Menu.tsx after Commander's Record. Takes faction prop.
- enterMatch(): always loads server snapshot (turn-0 snapshot guaranteed at create); sets game.state.online metadata.
- OnlineGame.tsx (controller, mounted in Home.tsx): handoff arbitration — own handoff auto-confirms (confirmHandoff), remote handoff → submitTurn(serializeState) + waiting overlay + 5s status polling; pulls snapshot via loadOnlineSnapshot(state, myTribe) when it's our turn; reports finished game (winner me/opponent).
- routers: match.create/join/get({match,state})/status/myMatches/abandon; submitTurn(turnNumber = matchInfo.turnNumber+1).
- dotenv error in devserver.log is STALE (from before pnpm install; server now boots fine, HTTP 200).

## v18 phase-5 progress (relic + minimap)
- Guardian's Relic: new HeroPerkId "relic" (types.ts) — NOT in HERO_PERK_POOL; granted in state.ts attack() when d.guardian && d.awake && a.hero: +relic perk, +4 maxHp; rules.ts wires +15% atk (previewCombat), *1.15 defense (defenseBonus), forecast lines.
- Minimap.tsx: camps drawn as orange diamonds when explored; strength>=3 → pulsing red ring (Date.now()-based alpha + 400ms interval repaint via setPulseTick); world units (tribe<0) drawn #c03030 (was crash risk: s.tribes[-1].color).
- NOTE: main draw useEffect depends on [open, s, g.getVersion()] — pulse tick state change re-renders component, effect re-runs because s identity unchanged?? — VERIFY: effect deps don't include tick, but re-render alone doesn't re-run effect. Must add tick to deps if ring doesn't pulse.
- Remaining: verify relic grant in browser, minimap visuals, full verification pass, update todo.md marks, checkpoint.

## v18 COMPLETE (verified)
- Relic grant verified in-browser: hero kills awake guardian → perks ["relic"], maxHp 14→18, log lines correct.
- Minimap verified: camp diamond (232,132,58) + red ring pulsing (alpha changes between frames: 161→75 red channel).
- Solo regression: 3 turns AI play, zero console errors.
- Tests 6/6 pass, tsc clean. todo.md v18 items marked [x].
- Online duels remain single-browser-verified (arbitration/round-trip logic tested via console); true two-account E2E needs two real Manus accounts — flagged honestly to user.

## v19 progress (active)
- Phase 1 DONE: buildResultCard()/scoreBar() in core/challenges.ts (ResultCardInput; 🟧x(score/60 capped 10)+⬛; "⚒️ SUNDER Daily — <label>" format). GameOver (Menu.tsx ~L640): copyResult() handler + cyan "Copy result" button shown when s.challenge; uses dailyChallenge()/weeklyChallenge() label, currentScore attempts, game.newChallengeBest, ClipboardCopy icon imported L16.
- Phase 2 TODO: TribeForge.tsx (ui/), customTribe.ts (core/): CustomTribeConfig L10, FORGE_PASSIVES L19, loadCustomTribe L52, saveCustomTribe L62, customTribeDef L71. Preset gallery: 3-4 pre-rolled CustomTribeConfig templates + "remix" loads into forge state. Lore hovers: faction cards in Menu.tsx MainMenu (~L300-420?); lore text lives in FactionIntro.tsx presumably (per-tribe lore paragraphs).
- Phase 3 TODO: turn notifications — read /home/ubuntu/skills/webdev-owner-notifications/SKILL.md first (owner-only likely; scope honestly: notify OWNER; for opponents use in-app badge already built).
- Phase 4 TODO: leaderboard — DB table challenge_scores (userId,name,kind,periodKey,score,won,turns,attempts,updatedAt unique(userId,kind,periodKey)), routers leaderboard.submit/top/myRank, submit from GameOver when signed in + challenge run; Leaderboard panel in menu (OnlinePanel pattern); vitest.
- v18 facts: routers.ts has profile router (profile.get/sync) + match router; db.ts helpers; server tests server/match.test.ts createCaller pattern with mock ctx; trpc client client/src/lib/trpc.ts; useAuth @/_core/hooks/useAuth; startLogin @/const.
- Phase 2 DONE: FORGE_PRESETS (4 presets, customTribe.ts end) + gallery strip in TribeForge.tsx (remix() loads config); LORE_TEASERS exported from FactionIntro.tsx (title+first lore sentence); hover overlay on TRIBE_DEFS.map faction cards in Menu.tsx (group-hover opacity overlay). Menu renders OK (screenshot verified).
- v19 phase 3 DONE: TurnAlerts.tsx (client/src/game/online/) polls match.myMatches every 30s when signed in; toasts+levelup sfx+tab title flash when a duel becomes your turn; mounted in App.tsx.
- v19 phase 4 IN PROGRESS: leaderboard_entries table added to schema (userId, challengeKey "daily:2026-07-23"/"weekly:2026-W30", commanderName, score, won, turns). TODO: db helpers (upsertLeaderboardEntry keep-best, getLeaderboard top50+myRank), lb router (submit: protected, list: public w/ optional auth for rank), client submit hook on challenge gameover (Menu.tsx GameOver uses recordChallengeScore in core/challenges.ts), Leaderboard panel in OnlinePanel or challenge cards area of Menu.tsx.
- challenges.ts facts: ChallengeSetup.key e.g. "2026-07-23" (daily) / "2026-W30" (weekly); currentScore(kind), recordChallengeScore(kind,score,won,turns) returns isBest; buildResultCard exists (v19 phase 1).

## v19 verification status (Jul 23)
- All v19 features implemented + tests pass (13 vitest: match 5, auth 1, leaderboard 7). tsc clean.
- Verified in browser: Global Leaderboard panel opens (daily/weekly tabs, empty state, sign-in prompt, "resets in" countdown). Lore hovers render on faction cards (lore text in DOM via group-hover overlay). Leaderboard toggle styled like other panels.
- LeaderboardSubmit mounts on GameOver for challenge runs; submits once when signed in; server keeps best per period; weekly key zero-padded (W30) both sides.
- Still to verify: TribeForge preset gallery visual, result-card copy button on challenge gameover (needs a finished challenge run), TurnAlerts (needs sign-in; logic-only OK).
- Remaining before checkpoint: mark todo.md v19 items [x], smoke test, checkpoint + deliver.
- v19 final smoke: game plays turns fine post-v19; LORE_TEASERS error in log was stale (10:41, pre-import-fix); no errors after 10:50. Result card verified in Node (correct output). Preset gallery verified in browser (Emberguard remix loads name/passive/unit/tech). Leaderboard panel + tabs verified. todo.md v19 marked [x].
