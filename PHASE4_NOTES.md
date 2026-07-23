# v14 Phase 4 — Two new tribes: COMPLETE

- TRIBE_DEFS now 6: +Nerivane (tideborn, tidecaller) +Dravok (stonebound, bulwark)
- Roster system: 4 of 6 defs per match; `Tribe.defIndex` = roster identity; `newGame({roster})`
- Menu startGame builds roster: human picks + random AI fill; challenge mode stays classic-4
- Rules: tidecaller swims (cost 1 on water), +30% atk from water; bulwark aura −20% dmg to adjacent allies; tideborn port 1★ & boat +1 mp; stonebound walls 3★ & +10% city defense
- portCost/wallCost helpers used in state.ts + Hud.tsx
- AI: unique pick via defIndex; tidecaller/bulwark combat scoring
- FactionIntro: intros keyed by defIndex, 6 entries
- Legacy saves: defIndex backfilled in continueGame
- tsc clean

# v14 Phase 5 — Tribe Forge: COMPLETE

- core/customTribe.ts: CustomTribeConfig persisted at polyforge-custom-tribe-v1; building blocks = 6 passives, 6 unique units, 6 start techs, 8 banner colors; CUSTOM_DEF_INDEX = 6
- newGame({custom: {slot, config}}) injects forge def into a roster slot; Tribe.customUnique overrides unique unit
- rules.ts uniqueUnitOf(s, tribe) — forge override else defIndex-keyed; trainableUnits + ai.ts use it
- ui/TribeForge.tsx modal: name/color/passive/unit/tech pickers, live preview, disband; wired into MainMenu faction grid (card when forged, dashed CTA when not), works in solo + hot-seat
- FactionIntro: generic forged intro when defIndex >= INTROS.length
- Menu `tribe` accent color safe for CUSTOM_DEF_INDEX; tsc clean

Next: Phase 6 — verify v14 in browser (diplomacy, replay, challenges, new tribes, forge), checkpoint, deliver

# Monetization model (user-approved direction, implement at/after v18 backend)
- Premium-content model (Polytopia-style), no consumables, no pay-to-win
- Tribes $1.99-2.99 each; 3-tribe bundle $4.99-6.99; map/biome expansion $3.99-4.99 (biome + terrain mechanics + worldgen + scenarios + cosmetic theme); campaign pack $4.99-7.99; complete edition $19.99-24.99; NO single-map $0.99 SKUs
- Free base stays complete: 4 tribes, all modes, 3-4 world types free forever; Nerivane/Dravok candidates for first premium pair
- Multiplayer: ranked maps universal; HOST-OWNERSHIP rule (host owning expansion unlocks map for all participants); paid content never strategic advantage (sideways power rule for tribes)
- Cosmetic layer idea: banner styles, unit skins, victory anims, premium forge parts $0.99-1.99
- Engineering rule NOW: keep tribes/biomes/scenarios data-driven + modular so entitlement gating is a config flag later (forge already works this way)
- UNCAPPED content pipeline (user decision): new tribes + map/biome expansions released indefinitely; complete edition = "everything so far" (Polytopia-style option a); every new tribe must be pure data: def entry + unique-unit stats + mesh + intro, no core-code changes

# v14 Phase 6 verification results (browser, preview URL https://3000-i6ec6uow94ogf0k6buvye-ab5232aa.us2.manus.computer/)
VERIFIED OK:
- Menu: 6 tribe cards + Tribe Forge dashed CTA render; daily (Kharzul/continents/11x11/normal) + weekly (Sunwei/highlands/13x13/hard) challenge cards with countdowns
- Forge: created "Emberfall" (rose, scholars, arcanist, organization); card replaces CTA, edit-hammer opens modal; solo game starts with defIndex 6, customUnique arcanist, techs [organization]; roster = Emberfall(d6), Auren(d0), Kharzul(d1), Dravok(d5); forged FactionIntro card shows generic lore + passive + arcanist + openings
- Diplomacy: offerPeace(1) accepted ("armies dwarf theirs"), peace matrix symmetric until turn 6; demandTribute(2) refused; giftStars(3,3) transferred 3 stars; diploUsed one-action-per-tribe-per-turn entries recorded
- Peace enforcement: stageAttack vs peaceful tribe blocked (false), vs at-war tribe staged fine (dmg 5)
- Replay: 10 events recorded (turn markers, diplo events, techs); Match Chronicle modal on GameOver works: event list w/ turn groupings, prev/next, Autoplay, "10/10 events"
- GameOver: leaderboard, score trajectory chart, match stats table all fine w/ custom tribe listed
STILL TO VERIFY: daily/weekly challenge start + determinism + best-score record; new tribes in-game (Nerivane tidecaller swim/water-strike, Dravok bulwark aura) quick rule checks; hot-seat with custom tribe optional; then cleanup localStorage, checkpoint, deliver

# v14 final verification (complete)
- Daily challenge: starts from menu card, challenge="daily", forced tribe Kharzul(d1); DETERMINISTIC (same map fingerprint across two starts); best score recorded to polyforge-challenges-v1 (score 200, attempts 1) at gameover
- Tidecaller: swims shallow water (moveCost 1), correctly blocked from deep ocean (by design); +30% water-strike modifier chip appears and dmg boosted (9 vs base)
- Bulwark aura: adjacent-ally damage reduced (3 vs 4 without bulwark) with "−20% damage taken" chip
- localStorage cleaned; app at fresh menu; ready for checkpoint. NOTE: newGame API is opts {size, humanTribe, difficulty, seed?, preset?, humanTribes?, challenge?, roster?, custom?}
