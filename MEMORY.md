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
- REMAINING: full-page screenshots + checkpoint + delivery.
- Test tip: reload page first, then `const mod = await import('/src/game/core/state.ts');
  window.__g = mod.game;` newGame({size:11,humanTribe:0,difficulty:'normal',seed:12345});
  human warrior id=1 at (9,7).
- After testing: save checkpoint, deliver with manus-webdev:// attachment.
