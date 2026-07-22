# Game Plan: Polyforge (Polytopia-like 4X)

## Risk Tasks

### 1. Procedural map generation + isometric tile rendering
- **Why isolated:** Procedural terrain distribution (continents, forests, mountains, resources, village placement, fair spawn spacing) can produce degenerate maps; instanced tile rendering with per-tile colors and extruded "cake slice" look needs a custom mesh approach in Babylon.
- **Approach:** Square grid 11×11 (Polytopia-style, rendered with an ArcRotateCamera locked to isometric-like angle). Seeded RNG. Generate landmass via radial falloff + value noise; classify ocean/water(shallow)/grass/forest/mountain. Place capitals on a spaced ring, villages with min-distance constraint, resources (fruit on grass, animals on forest, minerals on mountain) probabilistically near cities/villages. Tiles = flattened box meshes (thin instances or merged) with vertex colors; forests get cone trees, mountains get pyramid peaks as separate simple meshes.
- **Verify:** Screenshot shows a coherent island: grass majority, forests clustered, mountains sparse, shallow water rim around land, 4 capitals far apart, villages spread out, resources visible. No z-fighting, no missing tiles.

### 2. Selection/highlight + movement/attack range flow
- **Why isolated:** Picking on many meshes, range highlighting (BFS with terrain movement costs), and click-to-move state machine are error-prone when mixed with combat and AI.
- **Approach:** Central `GameWorld` state machine: idle → unitSelected(shows reachable tiles via Dijkstra with move points, attackable enemies in range) → action resolves → state refresh. Highlights = translucent overlay planes pooled and repositioned.
- **Verify:** Clicking a unit highlights exactly its legal moves/attacks; clicking a highlighted tile moves with hop animation; clicking elsewhere deselects; no stale highlights.

## Main Build

- Turn system: player tribe then 3 AI tribes; per-turn star income; unit refresh.
- Cities: capture villages/enemy cities by standing on them 1 turn; city levels via harvested population; borders 1-tile radius (2 after upgrades skipped for scope); train units in cities.
- Economy: stars; harvesting resources (fruit/animals/minerals) costs stars, gives population; buildings omitted for scope except implicit.
- Units: Warrior, Archer, Defender, Rider, Swordsman, Knight, Catapult with Polytopia stats; one move+one attack per turn (Dash for melee-after-move allowed by default like Polytopia warriors have Dash).
- Combat: Polytopia formula: attackForce = attack × (attackerHP/maxHP); defenseForce = defense × (defenderHP/maxHP) × defenseBonus; damage rounding per accepted formula; retaliation for melee if defender survives and attacker in range.
- Tech tree: 4 branches × 2 tiers (8–12 techs): Hunting(harvest animals)→Archery(Archer, forest defense); Organization(harvest fruit)→Shields(Defender); Climbing(move mountains)→Mining(harvest minerals)→Smithery(Swordsman); Riding(Rider)→Free Spirit→Chivalry(Knight); Mathematics(Catapult). Cost scales with number of cities.
- Fog of war (lite): unexplored tiles rendered dark; explored persist.
- AI: heuristic — harvest affordable resources, train units up to cap, move units toward nearest capturable village/enemy city, attack when favorable, capture when standing on target.
- Win/Lose: capture all enemy capitals (win), lose own capital (lose), or turn 30 score end.
- UI: main menu (tribe select, map size), top HUD ribbon (stars, income, turn, tech button), bottom action dock (unit/city actions), tech tree drawer, end-turn button, game-over overlay.

- **Assets needed:** reference.png (art direction), logo.png (menu + favicon), menu-bg.png (main menu hero). Terrain/units are procedural low-poly meshes per art direction.
- **Verify:**
  - Movement/attack legality matches rules; combat numbers match formula
  - Turn cycle stable over 30 turns; AI acts each turn without stalling
  - UI readable, no overflow; tribe colors consistent
  - No console errors during a played demo; `pnpm check` clean
  - reference.png consistency: palette, isometric angle, faceted look

