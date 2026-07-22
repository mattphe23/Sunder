# Polyforge v10 — Faction-unique units (v9 complete: 277ff116) — ALL VERIFIED

## 1. Rules & data
- [x] Design 4 unique units: Arcanist (Auren, heal +2 adjacent), Berserker (Kharzul, +50% vs wounded),
      Warden (Sunwei, free mountain move + 1.7 def on mountains), Raider (Vessari, plunder 2★/kill)
- [x] types.ts: UnitType + UNIT_STATS with faction field + perk text
- [x] rules.ts: trainableUnits faction filter; berserker atk mult; warden moveCost/defenseBonus
- [x] state.ts: arcanist heal in beginTurn; raider plunder in attack()
- [x] ai.ts: 45% unique-unit training pref; berserker/raider target scoring

## 2. Visuals & UI
- [x] scene.ts: arcanist robe+bobbing orb, berserker slab+axe blades, warden tower+cap, raider capsule+pennant
- [x] Hud.tsx: ✦ violet unique badge in training grid + perk line in unit card

## 3. Verify + deliver
- [x] pnpm check clean
- [x] Browser verified: restriction (own only, 0 leaked ×4 tribes), arcanist heal 4→6, berserker dmg 10→20
      vs wounded, warden 3 dmg vs defender 4 + climbs w/o tech (warrior blocked), raider +2★/-2★ on kill,
      AI Vessari raider plundered during live AI turn, meshes render distinct
- [x] localStorage cleared, back to menu
- [ ] Checkpoint v10 + deliver
