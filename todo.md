# Polyforge v7 — City Walls + Match Statistics

## 1. City walls
- [ ] types.ts: City.walls?: boolean; WALL_COST constant
- [ ] rules.ts: wall defense bonus for defenders garrisoned in a walled city
- [ ] state.ts: buildWalls(cityId) action (level >= 3, cost stars)
- [ ] scene.ts: rampart ring visual around walled cities
- [ ] Hud.tsx: Build Walls button in city panel (level 3+, shows cost)
- [ ] ai.ts: AI builds walls on high-level cities when affordable

## 2. Match statistics
- [ ] types.ts: GameState.stats per tribe { battlesWon, unitsLost, starsEarned, ruinsClaimed, citiesCaptured, techsResearched }
- [ ] state.ts: increment stats in attack/income/ruins/capture/research; include in save
- [ ] Menu.tsx: stats panel on GameOver next to score chart

## 3. Verify & deliver
- [ ] TS check clean
- [ ] Browser test: walls (bonus applied in combat preview), stats accumulate & show on game over
- [ ] Clear test saves, checkpoint, deliver
