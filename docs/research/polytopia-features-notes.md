# Research notes: Polytopia feature set (working file)

Sources: polytopia.fandom.com wiki (City, Population, City Upgrades, Strategies), retrieved Jul 24, 2026.

## Economy & city system (CONFIRMED — the user's example feature)
- Currency: "stars". Cities produce 1 star/turn per level. Capital: +1 star (human). Workshop/Park: +1 each. Sieged city: zero income.
- **Population/leveling loop**: cities level via POPULATION, not stars directly. Upgrading city from level n-1 to n requires n population.
  - Population sources: harvest fruit (2★→1 pop), hunt animal (2★→1), fishing (2★→1), lumber hut (3★→1), farm (5★→2), mine (5★→2), port (7★→1), sawmill/windmill/forge (adjacency-based: +1 or +2 per adjacent lumber hut/farm/mine), temples (20★→1, slow-growing score), city connections (roads/ports: +1 pop to capital AND connected city).
  - Buildings destroyed / connection lost → population lost; can go NEGATIVE (red bars), reducing income (never below 0).
- **City upgrade rewards (choice of 2 per level)**: L2: Workshop (+1★/turn) or Explorer (auto-scout); L3: City Wall (defense bonus) or Resources (5★); L4: Population Growth (+3 pop) or Border Growth (city territory expands); L5+: Park (+1★/turn, +250 score) or Super Unit (Giant).
- Unit capacity: city supports level+1 units (dots in pop bars). Capturing unit migrates to captured city. Ruin-spawned units don't consume capacity.
- Tech cost scales with city count: +1/+2/+3 stars per extra city for T1/T2/T3 techs.
- Villages: neutral, capture by ending turn on them; no more than one per 3x3 area; none at map edges.
- Terrain economy actions: Clear/Chop Forest (1★, removes forest), Burn Forest (→field), Grow Forest (5★), whale hunting (10★), starfish harvesting (10★, Navigation).
- Capital castle: decorative unique per tribe; capitals give bots varying income by difficulty (easy 1, normal 2, hard 3, crazy 5).

## Key strategy meta (player-level knowledge)
- Income measured in "turns to return" (TTR); workshop = 2 TTR, L4 5-star reward = 1 TTR.
- Scorched-earth: chop forests before losing a city to deny economy.
- Expansion raises tech cost but usually worth it.

## TODO research remaining
- [x] Combat formula, unit roster + skills (below)
- [x] Tech tree structure (below)
- [ ] Tribes (16) + special tribes' unique mechanics (Aquarion, Elyrion, Polaris, Cymanti) — partial via tech/unit notes
- [x] Game modes (below)
- [ ] Diplomacy details, score system details
- [ ] Map generation, ruins, terrain, movement rules
- [ ] Monetization model, platforms
- [ ] Player sentiment: praise/criticism/requests

## Combat (wiki/Combat)
- Stats: attack, defence, HP. Damage formula: attackForce = atk*(hp/maxHp); defenseForce = def*(hp/maxHp)*defenseBonus; totalDamage = aF+dF; attackResult = round((aF/total)*atk*4.5); defenseResult (retaliation) = round((dF/total)*def*4.5). Splash = attackResult/2 unrounded.
- Defence bonus: 1.5 terrain (forest w/ Archery, mountain w/ Climbing, water/ocean w/ Aquatism, city for fortify-skill units), 4.0 city wall. Poison halves these (0.5/0.7/2).
- Melee units move into killed unit's tile; ranged don't. Retaliation only if defender survives, can see/reach attacker, no Surprise/Stiff.
- Healing: recover action 4 HP friendly / 2 HP neutral-enemy territory; Mind Bender heals adjacent 4 HP.
- Battle preview UI: hover/hold shows predicted damage; sweat = kill, ring = attacker dies to retaliation.
- Vision: mountains 2-tile sight; scout skill 2-tile.
- Cymanti mechanics: swarm (+1 move), poison (-50% def, -1 move, no heal, spores on death).

## Units (wiki/List_of_Units) — 65 total
- Land (10): Warrior 2★ 10hp 2/2 m1, Archer 3★ r2, Defender 3★ 15hp 1/3, Rider 3★ m2 escape, Swordsman 5★ 15hp 3/3, Mind Bender 5★ heal/convert, Knight 8★ 3.5atk m3 persist (kill-chain), Catapult 8★ 4atk r3 0def, Cloak 8★ hide/infiltrate, Giant (super) 40hp 5/4.
- Naval (7): Raft (transport, from port), upgrades: Scout 5★ m3 r2, Rammer 5★ 3/3, Bomber 15★ splash r3; Dinghy, Pirate, Juggernaut (naval super).
- Super units (8): Giant, + tribe variants: Dragon Egg→Baby→Fire Dragon (Elyrion), Gaami (Polaris), Crab (Aquarion), Centipede+Segment (Cymanti).
- Special-tribe units (38): Aquarion mermaid variants (amphibious), Polaris ice units (freeze/skate), Cymanti bugs (poison/creep/explode), Elyrion Polytaur/Navalon.
- Other: Dagger/Pirate (ruins/ambush spawns), Bunny/Bunta (easter egg), Guard Tower.
- Unit skills vocabulary: dash, fortify, escape, persist, stiff, static, scout, hide, infiltrate, carry, water, splash, freeze, poison, creep, grow, convert, heal, surprise, independent, amphibious, explode, stomp, eat, air/fly, double attack, tentacles, drench, skate, auto-freeze.

## Technology (wiki/Technology)
- 5 branches from 5 T1 techs (Climbing, Fishing, Hunting, Organization, Riding), each forking into 2 T2 → each T2 → 1-2 T3. ~25 techs total.
- Cost = tier × #cities + 4. Literacy (Philosophy) = -33% research cost.
- Each tribe starts with a unique tech (except Luxidoor/Aquarion).
- Special tribes REPLACE techs/units in the tree (Polaris: Frostwork/Sledding/Polarism; Cymanti: Hydrology/Recycling etc.).
- Techs unlock: units, buildings, terrain movement/defence bonuses, abilities (chop/burn/grow forest, disband, destroy), tasks (for monuments).

## Game modes (wiki/Game_Modes)
- Single-player: Perfection (30-turn score race, weekly-reset global leaderboard, difficulty bonus multiplier up to 291%), Domination (eliminate all, rated 4-part: speed/battle/tribes destroyed/difficulty), Creative (custom opponents/map type/map size incl. 400- and 900-tile, Perfection/Domination/Infinity rules), Boot Camp (scripted tutorial).
- Difficulty: easy/normal/hard/crazy — affects bot aggression AND bot capital income (1/2/3/5 SPT).
- Tribe progression: score thresholds grant 1-3 stars per tribe + halo at 100k (Perfection) / rating % (Domination) — per-tribe mastery metagame.
- Multiplayer: Pass & Play (local, free) + online (Glory: first to 10k points; Might: capture all capitals), Elo rating, friend codes, random lobbies. Requires ≥1 purchased tribe for online.
- Weekly challenges exist (leaderboard resets Monday).

## Diplomacy (wiki/Diplomacy + related)
- Diplomacy is a T3 tech: unlocks Cloak (stealth infiltrator), Embassy (build in another tribe's capital → +stars/turn), Capital Vision, and visibility of who is at war/peace.
- Strategy T2 tech unlocks Peace Treaty. Tribe relations system tracks attitude. (Polytopia's diplomacy is deliberately shallow: treaties + embassies, no trading/alliances.)

## Ruins (wiki/Ruin)
- Examine by starting turn on ruin (consumes turn). Rewards (uniform random): 10 stars; free random tech; +3 pop to capital; free Explorer; Veteran Swordsman (land) / Veteran Rammer w/ Warrior (water); Aquarion-only Lost City (L3 walled city on ocean).
- Ruins can't spawn adjacent to capital/other ruins; block tile development until examined.

## Score (wiki/Score)
- Categories: Army/Territory (5 pts per star of unit cost, 50/super; 20 pts/territory tile; 5 pts/explored tile), Cities (100 + 50/level; Park 250), Monuments 400 each; Temples 100-500 by level; Science 100/tier.
- Perfection difficulty bonus: 100% + 41%*ln(opponents) + 20/40/80% by difficulty (max 291%).

## Tribes & monetization (wiki/Tribes)
- 16 tribes: 12 regular (same tree; unique starting tech, start unit, terrain cosmetics, music/ambience, resource spawn rates) + 4 special (Aquarion, Elyrion, Polaris, Cymanti — unique trees/units/mechanics).
- Mobile: 4 free tribes; others $0.99–$2.99 IAP; special tribes $1.99. Steam: base game includes regular tribes; special tribes DLC $2.99. No ads.
- Tribe skins ($): cosmetic, change units/cities/music, some change color. Sunder parallel: our Store skins + Story Mode SKUs.
- Luxidoor starts with L3 capital, no starting tech. Aquarion amphibious. Elyrion can't chop/hunt, enchants animals. Polaris freezes terrain. Cymanti poison/bugs, no ports.
- Tribe-specific music/ambience per native tile selection — notable audio polish feature.

## Player sentiment (reviews + Reddit, retrieved Jul 24, 2026)

### Praise (what makes Polytopia loved)
- "Bite-sized 4X": full match < 1 hour, turns < 1 min, 30-turn Perfection cap. "Easy to pick up, hard to master." (cogconnected 85/100; thirdcoastreview)
- Single-resource elegance (stars for everything) forces real tradeoffs (econ vs war vs tech); "big turns" windfall feel is satisfying.
- Village-capture expansion (no settlers) praised as right pacing call.
- Bonus objectives/tasks (e.g. hoard 100 stars, pacifist streak = no attacks 5 turns) act like mini alt-win conditions and create mind-games (cogconnected).
- Multiplayer speed: best "actually finishable" multiplayer 4X; randomized maps + tribe variety = replayability.
- Clean minimalist art praised universally; PC version praised for full zoom-out + snappy UI vs mobile.

### Criticism (recurring, load-bearing)
- TheGamer 3/5: combat too shallow — "spam best unit and smash"; tech tree completes too fast leaving nothing to do; building placement lacks interlocking systems ("just fill population bars"); map clutter/readability at scale — units get lost, missed turns; no camera rotation, limited zoom (mobile); weak AI below "crazy" difficulty; dead online lobbies (PC, 2021); weak tutorial.
- Reddit meta-balance crisis (huge thread + 11 linked threads): Cymanti pick rate ~70% on small MP maps, "boring to play against"; community begged for YEARS for tribe-ban/disable in random multiplayer. Balance patches (Bardur nerf) shifted but didn't fix. Lesson: OP faction + no ban tool = community bleeding.
- "They ruined the game" thread: major update backlash — game became "slow, complicated, buggy"; muscle-memory disruption from big reworks angers veterans. Lesson: launch discipline > post-launch churn.
- Cloak/stealth unit widely called "tedious, not fun" vs AI spam.
- Feature requests seen: turn off Cloaks, choose opposing tribes (exists in SP via disable tribes; not in random MP), bigger maps, better AI.

### Implications for Sunder (draft)
- Our anti-turtling/pacing work directly addresses "shallow combat" critique; keep tech tree long enough to not complete early.
- City leveling loop (harvest→pop→level→reward choice) is THE core missing econ loop — it's what makes each city a mini-puzzle; recommend adding.
- Tasks/monuments (bonus objectives) = high-value addition (alt scoring paths, mind games).
- Tribe-ban option in any MP mode from day one; keep balance validated (we already have LLM playtest harness = advantage).
- Readability at zoom matters (our Next Unit + minimap help); keep camera zoom generous.
- Weekly challenge / leaderboard = retention driver (Perfection weekly reset).

## Sunder codebase audit (v33/v34-in-flight, Jul 24 2026)

### Economy & cities — WHAT EXISTS
- Terrain: ocean/water/grass/forest/mountain. Resources: fruit/animal/mineral on tiles.
- Harvest EXISTS: pay 2 stars (1 for Sunwei "harvesters"), tile in own city territory → +1 population; POP_PER_LEVEL → city.level++ (log only, NO level-up reward choice).
- Income: capital 2 + city 1 + (level-1) per city. No buildings (no lumber huts/farms/mines/sawmill/windmill/forge/market economy). No roads/city connections. No parks. No temples/monuments.
- KEY GAP vs Polytopia: level-up REWARD CHOICE (workshop/explorer, wall/resources, pop growth/border growth, park/super unit), star chest on level, border growth, walls only via... (walls exist on City via some path — check), no population-from-buildings adjacency (sawmill/windmill/forge).

### Units & combat
- Units: warrior, archer, defender, rider, swordsman, knight, catapult + 6 faction-uniques (arcanist/berserker/warden/raider/tidecaller/bulwark) + hero (leveling commander). Veteran promotion (3 kills → +5 HP). Boats/ships via sailing/navigation. No: mind bender (convert), cloak/dagger (stealth), giant (super unit), rammer/scout/bomber tiers, no disband.
- Combat: atk/def/dash/range/retaliation, terrain defense, walls bonus, battle forecast UI. Siege income pressure (v29).

### Tech
- 14 techs, 3 tiers, single-prereq chains, Scholars discount. Polytopia has ~24+ in 5 branches of 3 tiers. Missing tech-unlocked abilities: roads, trade, philosophy discount, terraforming (burn/grow forest, clear), destroy building, bridges.

### Modes & meta (Sunder EXTRAS beyond Polytopia in many cases)
- Modes: solo skirmish (4 AI levels incl. Impossible), Pass&Play hot-seat, ONLINE async multiplayer, daily+weekly challenges, friend challenge links, Story Mode (2 chapters, 10 missions, stars/pars/rewards/epilogue), map packs, Tribe Forge (custom tribe builder!), global leaderboard, replay system, achievements (10), profile.
- Victory: domination, score (Ascendance 900), + 8 asymmetric per-tribe victory paths (unique!). Polytopia: Domination, Perfection (30-turn score), Glory/Might online modes, Creative mode.
- Diplomacy: peace treaties (6 turns), tribute (5 stars), grudges, coalitions vs leader (coalition.ts). Polytopia's is thinner in some ways (embassies/cloaks though).
- World events (Sunder-unique): barbarian camps, storms, guardians. Polytopia has none of these.
- 8 tribes + custom forge; Polytopia 12 regular + 4 special.
- Heroes (leveling commanders w/ perk choices) — Sunder-unique vs Polytopia.
- Monetization: Stripe store — tribe skins (6, live 3D previews), Story Mode SKU, map packs; Polytopia: tribe IAP + skins DLC.
- No: ruins/examine rewards, explorer unit, weekly leaderboard reset per mode, Elo, spectate, mirror matches, creative/sandbox mode parameters (we have some via Forge?), tribe ban in MP (we don't have random MP lobbies), city naming, stats graphs end screen(check), no score breakdown detail screen.
- Audio: menu music, SFX, mute. No per-tribe music/ambience.
- Missing Polytopia QoL: camera rotation N/A (we have fixed cam + zoom), turn timer options online, resign.
