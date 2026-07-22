# Polyforge v8 — Siege units & Onboarding tutorial

## 1. Catapult siege unit
- [ ] types.ts: add "catapult" UnitType with stats (high attack, low defense, range 2, move 1, cost ~8), Siegecraft tech unlock
- [ ] rules.ts: wall bonus ignored when attacker is catapult; range-2 attack targeting
- [ ] state.ts: no retaliation against ranged catapult attacks
- [ ] scene.ts: catapult mesh (wooden frame + throwing arm + boulder)
- [ ] ai.ts: AI researches Siegecraft and trains catapults vs walled cities
- [ ] Hud.tsx: catapult appears in train list once tech is researched

## 2. Onboarding tutorial
- [ ] Tutorial overlay component: step-based guide (welcome → select unit → move → capture village → research → end turn)
- [ ] Trigger on first game ever (localStorage flag polyforge-tutorial-done), skippable
- [ ] Steps advance on the matching player action; highlight relevant UI areas

## 3. Verify & deliver
- [ ] TS check clean
- [ ] Browser test: catapult vs walled city (no wall bonus, no retaliation), open-field weakness
- [ ] Browser test: tutorial flow on fresh profile, skip works, doesn't reappear
- [ ] Clean save/hall state, checkpoint, deliver
