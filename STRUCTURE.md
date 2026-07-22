# Structure

- `client/src/components/GameCanvas.tsx` — Babylon host (engine lifecycle only).
- `client/src/game/scene.ts` — `createGameScene(engine, canvas): Promise<GameHandle>`; wires world, camera, input, render loop hooks, exposes bridge to React HUD via event emitter.
- `client/src/game/core/types.ts` — Tile, Unit, City, Tribe, Tech, GameState types + constants.
- `client/src/game/core/mapgen.ts` — seeded procedural map generation.
- `client/src/game/core/rules.ts` — movement (Dijkstra), combat formula, capture, harvesting, training, tech costs.
- `client/src/game/core/state.ts` — GameState store + mutation actions + event emitter (framework-agnostic).
- `client/src/game/core/ai.ts` — heuristic AI turns.
- `client/src/game/render/board.ts` — tile meshes, decorations (trees, mountains, resources), fog.
- `client/src/game/render/pieces.ts` — unit + city meshes, animations (hop, lunge, flash).
- `client/src/game/render/highlights.ts` — pooled highlight overlays.
- `client/src/game/render/camera.ts` — isometric ArcRotateCamera with pan/zoom clamps.
- `client/src/components/hud/*` — React HUD: TopBar, ActionDock, TechDrawer, GameOver, MainMenu.
- `client/src/pages/Home.tsx` — menu ↔ game switch; renders GameCanvas + HUD overlays.

React↔game bridge: `state.ts` emits `changed` events; React subscribes via `useSyncExternalStore`-style hook (`useGameState`). React calls actions through a `GameController` singleton set by scene.ts.

