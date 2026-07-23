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
- [x] state.ts: slot-aware save keys (slot1=legacy polyforge-save-v1); activeSlot persisted; slotSummaries()
- [x] Menu slot picker (3 cards, summary or Empty); Continue/New act on selected slot
- [x] Cross-slot bleed bug found & fixed (setActiveSlot resets in-memory game w/o autoSave;
      autoSave clears only on gameover)

## 2. Battle forecast
- [x] combatModifiers() in rules.ts; chips (amber atk / sky def) in BattlePreview; verified vs actual math

## 3. Mobile touch polish
- [x] 44px+ tap targets (BottomBar/train/preview buttons); pinch tuning (precision 60, delta %, inertia 0.75)

## 4. Verify + deliver
- [x] All verified in browser; 375px smoke test OK; checkpoint v13 = a5b38ca1

# Polyforge v14 — Diplomacy + Replay viewer + Daily challenge (v13 = a5b38ca1)

## 1. Diplomacy
- [ ] types.ts/state.ts: relations matrix (war/peace) + treaty state (peace turns remaining, tributeDemanded)
- [ ] Actions: offer peace treaty (N-turn non-aggression), demand tribute (stars) — one diplomatic action
      per rival per turn; breaking peace early has a cost (e.g., rivals refuse future treaties / score hit)
- [ ] AI acceptance model: relative military+economy strength ratio decides accept/reject; weak AI accepts
      tribute demands, strong AI rejects & may demand instead; AI may propose peace when losing
- [ ] Enforce peace: attacks/captures blocked between tribes at peace (rules + AI target filters)
- [ ] Diplomacy UI: rivals panel (relation status, strength hint, offer/demand buttons); notification of
      AI responses + incoming AI offers (accept/reject dialog); SFX on treaty/tribute
- [ ] AI↔AI truces (user: coalition seed): AIs sharing a strong common enemy (the score leader) sign
      truces with each other and redirect objectives at the leader — visible coalition pressure
- [ ] Gift stars action (user: coalition counterplay): human gifts 3★ to an AI — clears a grudge and
      biases the next acceptance check favorably

## 2. Replay viewer
- [ ] Record compact event log during match (moves, attacks, captures, tech, training) in state (persisted)
- [ ] GameOver screen "Watch replay" → step-through viewer: prev/next + autoplay over final board render,
      showing event text + highlighting affected tiles (bounded scope: event feed + tile highlights,
      not full board time-travel)
- [ ] Cap log size (e.g., 2000 events) to protect save size

## 3. Daily challenge
- [ ] Date-seeded RNG (YYYY-MM-DD) → same map/faction/difficulty for everyone that day; menu "Daily
      Challenge" entry showing today's date + played/unplayed state
- [ ] Seeded map generation (deterministic PRNG through mapgen path)
- [ ] Score entry saved per day in Hall of Conquest (date, score, outcome); one attempt counted per day
      (replays allowed but flagged as practice / not recorded)

## 3b. Weekly challenge (user request)
- [ ] Week-seeded map (ISO year+week) — same challenge all week; menu Weekly card next to Daily
- [ ] BEST score across unlimited attempts during the week is kept (optimize-your-score loop)
- [ ] Weekly entries (week id, best score, attempts, victory) shown in Hall of Conquest

## 3c. Two new tribes (user request)
- [ ] Tribe 5 "Nerivane" (teal, tide-themed): passive + unique unit (water affinity — e.g., embarked units
      keep defense / free ports); unique unit Tidecaller (ranged, water-adjacent bonus)
- [ ] Tribe 6 "Ordovai" (slate/bone, ancient-themed): passive (ruins/score) + unique unit Relictor
      (gains power from explored ruins)
- [ ] Integrate everywhere tribe count is assumed 4: TRIBE_DEFS length, mapgen capitals, menu grids,
      hot-seat picks, intro cards, scene tribe colors, AI
- [ ] Balance pass: passives comparable in strength to existing four

## 3d. Create-your-own-tribe forge (user request)
- [ ] Forge screen: name (validated), color picker (curated palette), passive choice (from all 6 passives),
      unique-unit perk choice (from all 6 unique units) — mix & match but bounded to existing balanced parts
- [ ] Custom tribe persisted (polyforge-custom-tribe-v1); appears as 7th pick in faction grids (solo,
      hot-seat, not daily/weekly — seeded challenges use fixed factions for fairness)
- [ ] Custom tribe plays with chosen passive + unique unit; intro card renders generic custom lore

## 4. Verify + deliver
- [ ] pnpm check clean; browser verify: treaty accept/reject vs strength, peace blocks attacks, tribute
      transfers stars, replay steps through a finished match, daily+weekly seeds reproduce identical maps,
      weekly keeps best score across attempts, new tribes trainable/AI-playable, custom tribe end-to-end;
      clean test localStorage; checkpoint v14 + deliver

# Polyforge v15 — Graphics pass (user request, after v14 ships)

## 1. Rendering pipeline
- [ ] DefaultRenderingPipeline: bloom (emissive ruin glows, capital spires), tone mapping, FXAA
- [ ] Soft shadows from the sun directional light (shadow generator, blur)
- [ ] SSAO if perf allows (check FPS on 13×13 map); graceful fallback
- [ ] Water shimmer: animated normal/scroll on water material; subtle wave motion

## 2. Combat & movement juice
- [ ] Unit hop/squash-stretch on move; hit flash + knockback on combat
- [ ] Floating damage numbers; city-capture particle burst; heal shimmer particles
- [ ] Richer procedural mesh silhouettes where cheap wins exist

## 3. Verify + deliver
- [ ] FPS sanity on largest map; visual screenshots; checkpoint v15 + deliver

# Polyforge v16 — Heroes + shareable challenges (user request)

## 1. Commander/hero units
- [ ] One hero per faction, spawns at capital start of game (or trainable once); levels via XP from
      kills/captures; on level-up player chooses 1 of 2-3 perks (attack aura, movement, self heal, etc.)
- [ ] Hero perks per faction flavored to identity; hero death = respawn cooldown or permanent (decide)
- [ ] Hero UI: XP bar in unit card, perk-choice modal on level-up; distinct hero mesh (crown/banner)
- [ ] AI uses its hero sensibly (keeps it safe at low HP, picks default perks)

## 2. Link-shareable challenges
- [ ] Encode challenge in URL params (?c=seed.preset.size.faction&score=NNN) — no backend needed
- [ ] "Challenge a friend" button on daily/weekly/game-over: copies link with your score
- [ ] Opening a challenge link → landing card "Beat Alex's 4,320?" (score from URL) → same seed game;
      result compares vs the challenger's score

# Polyforge v17 — Living map + asymmetric wins (user request)

## 1. Living map events
- [ ] Barbarian camps: spawn on neutral tiles every N turns, emit raider units that harass nearest tribe;
      clearing a camp gives stars
- [ ] Sea storms: random water regions blocked for 2-3 turns (visual overlay + movement block)
- [ ] Awakening ruins: dormant ruins may spawn a guardian mid-game if unclaimed by turn X
- [ ] Event notifications in recap/log; frequency tuned per map size; off in daily/weekly? (decide: ON,
      seeded deterministically so challenges stay fair)

## 2. Asymmetric win conditions
- [ ] Per-faction victory path alongside domination/score: Auren = complete full tech tree;
      Kharzul = win N battles; Sunwei = reach city level total X; Vessari = plunder/economy target;
      Nerivane/Ordovai = theirs; custom tribe = generic path
- [ ] Progress tracker UI (TopBar or panel); victory fires gameover with faction-path flavor text
- [ ] AI pursues its own path loosely (weight adjustments only, bounded scope)

## 3. Impossible AI (user request: skill-ceiling differentiator)
- [ ] 4th difficulty tier "Impossible" — a genuinely smarter brain, NOT resource cheats (0 or minimal
      star bonus; the point is it wins on play)
- [ ] Threat map: compute enemy reach/damage per tile; AI refuses bad fights, retreats wounded units,
      keeps capital garrisoned
- [ ] Task forces: units group and strike together (rally point → simultaneous arrival) instead of
      trickling in
- [ ] 2-3 turn lookahead for city assaults (take AND hold vs counterattack) — bounded search, perf-capped
- [ ] Economic optimizer: best-value build/research each turn (value per star heuristic)
- [ ] Faction play: uses own passive/unique properly, counters the player's faction
- [ ] Menu: Impossible tier with warning copy; Hall of Conquest tracks it separately
- [ ] Coalition logic (user): allied AIs stagger attacks on the leader's cities, avoid overlapping
      targets, and betray the coalition when the leader falls behind; counterplay via tribute/gifts

# Polyforge v18 — Online multiplayer (user request: MUST HAVE)

## 1. Full-stack upgrade
- [ ] webdev_add_feature web-db-user (backend + DB + Manus OAuth accounts)
- [ ] Read automation-and-scheduling + webdev-readme-fullstack skills BEFORE designing (async turns,
      notifications constraints)

## 2. Async matches
- [ ] Match model: seed/preset/size/factions + move-log or state snapshots per turn; invite by link
- [ ] Take-your-turn-whenever flow: server validates it's your turn, stores new state, notifies opponent
      (push notification API); rejoin from My Matches list
- [ ] Design decision: authoritative state = serialized GameState per turn (simple, replayable) vs
      move-log re-simulation (lighter, anti-cheat) — decide at build time

## 3. Real leaderboards
- [ ] Daily/weekly challenge scores go to DB leaderboard (name, score, attempts); local Hall stays as
      offline fallback; v16 share-links upgrade to point at real leaderboard entries

## 4. Verify + deliver
- [ ] Two-account end-to-end match; leaderboard writes/reads; checkpoint v18 + deliver

# Polyforge v19 — Polish batch (user request)

## 1. Challenge share cards
- [ ] "Copy result" button on daily/weekly game-over: Wordle-style emoji summary (game name, date/week,
      score, win/loss, attempts) copied to clipboard for pasting anywhere
- [ ] Pairs with v16 share links (include the challenge URL in the copied text)

## 2. Forge presets gallery
- [ ] 3-4 pre-rolled custom tribes in the Tribe Forge as starting templates (themed name/color/passive/
      unique combos); "remix" loads one into the forge for editing

## 3. Tribe-picker lore hovers
- [ ] Two-line lore teaser on each faction card (hover/long-press), previewing the intro card's flavor
- [ ] Works for all 6 tribes + custom tribe (generic forge lore)

## 4. Verify + deliver
- [ ] Browser verify all three; checkpoint v19 + deliver
