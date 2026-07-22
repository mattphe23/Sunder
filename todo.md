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
- [x] Checkpoint v10 + deliver (637e6d81)

# Polyforge v11 — Faction intro cards

- [x] Lore + strategy content for all 4 factions (INTROS in FactionIntro.tsx)
- [x] FactionIntro.tsx overlay (z-50, faction-colored frame/header/CTA, passive + unique unit + openings)
- [x] Trigger: GameState.showIntro set true in newGame only; dismissIntro() clears; persisted in autoSave
- [x] Intro card renders above tutorial (z-50 vs z-40) — tutorial appears after dismissal
- [x] pnpm check clean
- [x] Browser verified: Auren (blue) + Vessari (violet) cards correct; dismiss works; saved showIntro
      false after dismissal (Continue safe); mid-intro reload persists true (card re-shows)
- [x] localStorage cleaned; ready for checkpoint v11 + deliver

# Polyforge v12 — Sound + Hot-seat + Achievements (v11 = ce763395)

## 1. Sound design
- [x] Menu music generated + uploaded (/manus-storage/menu-theme_ab3abdad.mp3, HEAD 200 audio/mpeg)
- [x] sound.ts engine: 11 synth SFX + music loop w/ fade — all play without errors (verified in console)
- [x] Mute toggle TopBar + menu, persists polyforge-muted (verified "1"/"0" round-trip)
- [x] SFX wired to store events via GameCanvas subscription + click sounds on primary buttons

## 2. Pass-and-play hot-seat multiplayer
- [x] Menu mode toggle + P1-P4 faction picks; BEGIN label shows "N PLAYERS + M AI"
- [x] humanTribes in state; humanTribe repoints per human turn (fog + HUD follow, verified TopBar Auren→Kharzul)
- [x] Hand-off blocking overlay verified for both P1 (Auren) and P2 (Kharzul); confirm reveals board
- [x] Full cycle verified: Auren end → Kharzul handoff → end → 2 AI ran → turn 1 wrapped to Auren handoff
- [x] Tutorial + intro skipped in hot-seat; recaps cleared (info-leak prevention); solo mode regression OK
- [x] Win/lose: gameover only when all humans dead; hot-seat wins skip Hall ladder

## 3. Achievements
- [x] achievements.ts with 8 feats; TribeStats += capitalsCaptured/guardiansSlain/starsPlundered
- [x] Evaluated at all 3 gameover paths; unlock banners on GameOver screen
- [x] Menu Achievements collapsible (N/8 counter, locked/unlocked grid)
- [x] Console-verified: win unlocks all 8, repeat=0, loss unlocks only loseOk 3, hot-seat skipped

## 4. Verify + deliver
- [x] pnpm check clean; browser verified; test localStorage cleaned; ready for checkpoint v12

# Polyforge v13 — Save slots + Battle forecast + Mobile touch (v12 = 19a30984)

## 1. Save slots
- [ ] state.ts: slot-aware save keys (polyforge-save-v1:slot{1,2,3}); activeSlot persisted
      (polyforge-active-slot); migrate legacy polyforge-save-v1 into slot 1
- [ ] Save metadata per slot (mode solo/hotseat, faction(s), turn, difficulty, timestamp) for the picker
- [ ] Menu: slot picker UI — 3 slots showing summary or "Empty"; Continue/New Game act on selected slot;
      starting a new game in an occupied slot overwrites it (confirm not needed — visible in UI)

## 2. Battle forecast
- [ ] Reuse combat calc to predict damage + retaliation (and kill markers) without mutating state
- [ ] Show forecast UI when an enemy target is selected/hovered before confirming attack
      (works with existing pendingAttack two-tap flow)
- [ ] Include berserker wounded bonus / warden mountain defense / walls in the preview numbers

## 3. Mobile touch polish
- [ ] Larger tap targets: bottom HUD buttons, training grid, End Turn ≥44px on small screens
- [ ] Pinch-to-zoom tuning in scene.ts camera (pinchPrecision/wheel), clamp zoom range sensibly
- [ ] Verify no double-tap zoom hijack (touch-action manipulation on UI layer)

## 4. Verify + deliver
- [ ] pnpm check clean; browser verify slots (create/switch/persist), forecast numbers vs actual combat,
      mobile viewport smoke test (375px); clean test localStorage; checkpoint v13 + deliver
