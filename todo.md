# Polyforge v9 — Map presets + Undo move

## 1. Map presets
- [ ] Add MapPreset type ("continents" default | "archipelago" | "highlands" | "pangaea") to types.ts
- [ ] mapgen.ts: preset-specific terrain tuning (water/mountain/forest thresholds, land mass shape)
- [ ] newGame opts + persistence: carry preset through save/load
- [ ] Menu.tsx: map type selector row with the four presets
- [ ] Verify each preset generates and looks distinct (water %, mountains)

## 2. Undo move
- [ ] state.ts: snapshot last move (unit id, from x/y, prior moved flag); block undo if the move triggered ruin/reward, capture, embark/disembark change is fine to restore
- [ ] Invalidate undo on attack, capture, train, harvest, end turn, research (any irreversible action)
- [ ] Hud.tsx: Undo button in bottom bar, visible only when undo is available
- [ ] Verify in browser: move → undo restores position and move point; attack clears undo

## 3. Test + deliver
- [ ] TS check, browser verification of both features
- [ ] Clean preview state, checkpoint, deliver
