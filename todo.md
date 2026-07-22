# Polyforge v3 — Feature TODO

## 1. Save/Resume
- [x] Serialize game state to localStorage after every mutating action (auto-save)
- [x] "Continue" button on the main menu when a save exists
- [x] Clear save on game over / new game start
- [x] Verify in browser: play turns, reload page, continue restores exact state

## 2. Battle Preview Tooltip
- [x] stageAttack computes preview via previewCombat (damage + retaliation, kill flags)
- [x] BattlePreview panel with both units, damage, kill markers, Cancel/Attack
- [x] Confirm-to-attack flow: first click shows preview, second click commits
- [x] Verify in browser: preview numbers match actual combat results (−5/−5 exact match)

## 3. Verify & deliver
- [x] TypeScript clean
- [x] Browser test both features
- [ ] Checkpoint + delivery
