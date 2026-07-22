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
