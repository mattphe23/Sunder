# Polyforge v6 — Hall of Conquest + Unit Veterancy

## Feature 1: Hall of Conquest (difficulty leaderboard)
- [ ] state.ts: on human victory, record { difficulty, faction, turns, score, mapSize, date } to
  localStorage "polyforge-hall" (keep best 5 per difficulty, sorted by fewest turns then highest score)
- [ ] Menu.tsx: "Hall of Conquest" section/toggle on main menu with per-difficulty tabs showing
  best victories; empty state when no victories yet
- [ ] GameOver: badge when the finished match earns a Hall entry (e.g., "New record!")

## Feature 2: Unit veterancy
- [ ] types.ts: Unit.veteran flag (kills already tracked)
- [ ] state.ts: after a kill, if kills >= 3 and not veteran → promote: veteran=true, maxHp+5, full heal;
  log + recap-worthy message for human units
- [ ] scene.ts: golden crest (small diamond/chevron) above veteran units
- [ ] Hud.tsx: unit panel shows Veteran status and kill count
- [ ] battle preview: uses live stats so no change needed (maxHp affects defense force)

## Verify & deliver
- [ ] TS check + browser verification of both features
- [ ] Clear test saves, checkpoint, deliver
