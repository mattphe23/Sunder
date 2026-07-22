# Memory

- React 19 StrictMode double-mount guarded via startedRef in GameCanvas.
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
- v13 VERIFIED (all): forecast chips fired correctly (berserker vs wounded on mountain → Forgeborn+15%,
  Berserker+50%, Mountain+30%, Wounded-def chips; dmg 18, no retaliation). 375px full-page screenshot:
  menu + slot picker + world type stack cleanly. Cleaned all polyforge-save* keys. → checkpoint v13.
- Key API notes: game.subscribe((e) => ...) returns unsub; combat event has attackerId (look up
  s.units.find for type==="catapult" for catapult sound — may be dead, check defenderDied/attackerDied);
  Menu.tsx has MainMenu + GameOver; Hud.tsx has TopBar (top-left pill) + BottomBar.
- humanTribe currently single number s.humanTribe; hot-seat needs humanTribes: number[] approach —
  keep s.humanTribe as "current human" pointer to minimize refactor; isHuman flag on Tribe exists.
