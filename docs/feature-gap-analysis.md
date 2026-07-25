# Sunder vs. The Battle of Polytopia: Feature Gap Analysis

**Author:** Manus AI · **Date:** July 24, 2026 · **Sunder version:** v33 (v34 visual work in flight)

This document maps The Battle of Polytopia's complete feature set against Sunder's current build, incorporates what players praise and criticize about the original, and closes with prioritized recommendations for what to add — and, just as importantly, what *not* to add — before a formal launch. Research draws on the Polytopia community wiki, professional reviews, and community discussion threads [1] [2] [3] [4] [5].

---

## 1. The Economy: Polytopia's Core Loop vs. Ours

You asked specifically about the "chop trees near your castle, castle levels up" mechanic — and this is indeed the single most important structural difference between the two games. It is worth describing Polytopia's loop precisely, because it is subtler and better-designed than it first appears.

In Polytopia, **cities level up through population, not stars directly**. Raising a city from level *n−1* to *n* requires *n* population, and population comes from developing the tiles inside that city's territory: harvesting fruit or hunting animals (2★ → 1 pop), fishing (2★ → 1), building a Lumber Hut on forest (3★ → 1), a Farm or Mine (5★ → 2), or a Port (7★ → 1). Advanced buildings — Sawmill, Windmill, Forge — grant population *per adjacent* basic building, creating genuine placement puzzles. Roads and ports form **city connections** that add population to both the capital and the connected city [1].

The payoff structure is the clever part. Each level-up presents a **choice of two rewards**: Workshop (+1★/turn) or Explorer at level 2; City Wall or 5★ at level 3; +3 Population or Border Growth at level 4; and from level 5 onward, Park (+250 score) or a Giant super unit. Each city also supports **level + 1 units**, so leveling is simultaneously an economic, military, and territorial decision. Destroyed buildings and broken connections *remove* population — bars can go negative — which makes raiding meaningful [1].

**Where Sunder stands today:** we have the skeleton but not the flesh. Harvesting resources for population exists (2★ → 1 pop, with Sunwei's discount passive), cities level and add income (+1★/turn per level), and sieges zero out income. But we have **no buildings, no level-up reward choices, no border growth, no unit capacity tied to city level, no city connections, and no adjacency puzzles**. Our cities are counters; Polytopia's cities are little puzzle boxes.

**Should we add it? Yes — this is the highest-value gap on the board.** Reviewers who criticize Polytopia never criticize this loop; in fact the sharpest criticism (TheGamer, 3/5) is that building placement *stops mattering once the bars are full* — i.e., players wanted *more* of this system, not less [2]. A Sunder version could be scoped as: level-up reward choices first (cheap, huge decision density), then 3–4 basic buildings with one adjacency building, then unit capacity per level. We do not need all nine building types to capture 80% of the depth.

## 2. Full Feature Comparison

### 2.1 Economy and cities

| Feature | Polytopia | Sunder | Assessment |
|---|---|---|---|
| Single currency (stars) | Yes | Yes | Parity |
| Harvest resources → population | Yes | Yes (simplified) | Parity (core) |
| City leveling | Population-based, cost scales per level | Fixed pop threshold, income only | **Gap — recommend** |
| Level-up reward choice | 2 options per level (workshop/explorer, wall/stars, pop/border, park/giant) | None | **Gap — recommend (top priority)** |
| Buildings (huts, farms, mines) | 9+ types with adjacency bonuses | None | **Gap — recommend (scoped subset)** |
| Roads / city connections | Yes (+pop both ends) | None | Gap — optional |
| Unit capacity per city | Level + 1 | Unlimited | **Gap — recommend** (also fixes late-game spam) |
| Terraforming (chop/burn/grow forest) | Yes | None | Gap — optional |
| Temples / Monuments (score buildings) | Yes (tasks unlock monuments) | None | Gap — pairs with tasks |
| Tech cost scales with city count | Yes (tier × cities + 4) | Flat + Scholars discount | Gap — recommend (anti-snowball) |
| Siege income denial | Yes | Yes (v29) | Parity |

### 2.2 Units and combat

| Feature | Polytopia | Sunder | Assessment |
|---|---|---|---|
| Core roster | 10 land + 7 naval + supers (65 total with tribes) | 7 core + 6 faction-uniques + hero | Smaller but differentiated |
| Damage formula | HP-weighted attack/defense with retaliation | Comparable system + forecast UI | Parity |
| Veteran promotion | 3 kills → +5 HP | Same (v29) | Parity |
| Super units (Giant) | Yes, via city level reward | None | **Gap — recommend** (pairs with level rewards) |
| Mind Bender (convert) | Yes | None | Skip — polarizing |
| Cloak / stealth | Yes | None | **Skip — deliberately.** Players call it "tedious, not fun" [3] |
| Naval upgrade tiers (Scout/Rammer/Bomber) | Yes | Basic boats/ships | Gap — optional |
| Heroes (leveling commanders) | No | **Yes — Sunder advantage** | Keep |
| Faction-unique ground units | Only special tribes | All 8 tribes | **Sunder advantage** |
| Disband unit | Yes | No | Minor QoL |

### 2.3 Tech, map, and world

| Feature | Polytopia | Sunder | Assessment |
|---|---|---|---|
| Tech tree | ~25 techs, 5 branches × 3 tiers | 14 techs, 3 tiers | Gap — grows naturally with buildings |
| Ruins with random rewards | Yes (stars/tech/pop/explorer/veteran) | Decorative only | **Gap — recommend.** Cheap, adds exploration incentive; we're mid-remodel of the ruin visuals anyway |
| Explorer (auto-scout) | Yes | None | Pairs with ruins/level rewards |
| World events (camps, storms, guardians) | No | **Yes — Sunder advantage** | Keep |
| Map packs / sizes | Creative mode up to 900 tiles | Map packs (paid) | Rough parity |
| Fog of war | Yes | Yes | Parity |

### 2.4 Modes, meta, and monetization

| Feature | Polytopia | Sunder | Assessment |
|---|---|---|---|
| Domination mode | Yes | Yes | Parity |
| Perfection (30-turn score race) | Yes, weekly leaderboard reset | Score victory exists; no timed mode | **Gap — recommend** (retention driver) |
| Tasks / bonus objectives | Yes (e.g., hoard 100★, pacifist streak) | None | **Gap — recommend.** Reviewers single these out as depth-per-simplicity champions [4] |
| Asymmetric victory paths | No | **Yes (8 paths) — Sunder advantage** | Keep |
| Story campaign | No | **Yes (2 chapters, stars, rewards) — Sunder advantage** | Keep |
| Diplomacy | Treaties, embassies, cloaks | Treaties, tribute, grudges, coalitions | Different but comparable |
| Online multiplayer | Elo, Glory/Might, friend codes | Async MP, leaderboard, challenge links | Rough parity |
| Tribe ban/disable in MP | **No — top community request for years** [3] [5] | N/A yet | **Add from day one when random lobbies ship** |
| Custom tribe builder | No | **Yes (Tribe Forge) — Sunder advantage** | Keep |
| Daily/weekly challenges | Weekly | Daily + weekly + friend links | **Sunder advantage** |
| Per-tribe music/ambience | Yes — beloved polish detail | Single soundtrack | Gap — optional polish |
| Monetization | Tribe IAP $0.99–2.99, skins, no ads | Skins, Story SKU, map packs (Stripe) | Comparable, ours is content-forward |

## 3. What Players Say — and What It Means for Us

**The praise clusters around speed and elegance.** Reviewers consistently celebrate that a full 4X match finishes in under an hour with sub-minute turns, that a single currency forces real tradeoffs, and that village capture (no settlers) keeps pacing tight [4]. Sunder already inherits all of these decisions. The praise for **bonus objectives** is notable: cogconnected highlights how a "pacifist streak" task creates mind-games between players — depth without added rules [4].

**The criticism clusters in three places, and each is actionable.** First, *shallow late-game combat* ("spam your best unit and smash") and a *tech tree that completes too early* [2] — our anti-turtling work (siege pressure, battle score, veterancy) already attacks this, and a longer tech tree plus unit capacity limits would finish the job. Second, *map readability* — units getting lost in clutter caused missed turns [2]; our Next Unit cycling, minimap, and units-left badge exist precisely for this, and the v33+ art passes must keep readability as a hard constraint. Third — and loudest — the **multiplayer balance crisis**: Cymanti reached roughly 70% pick rate on small maps while the community begged for years for a tribe-ban option that never came [3] [5]. Our structural advantages here are real: the LLM playtest lab and balance verification harness catch dominance patterns before players do, and we should commit to shipping a tribe-ban toggle with any random-lobby feature.

One more community lesson worth internalizing: the "they ruined the game" backlash threads show that **large post-launch reworks anger veterans** even when beta feedback was positive [5]. The right time for systemic additions like city buildings is *now*, before launch — not after an audience has formed muscle memory.

## 4. Recommendations

**Tier 1 — close before launch (core-loop gaps):**
1. **City level-up reward choices** — the single highest decision-density feature we can add; reuses our existing perk-choice UI pattern from heroes.
2. **Unit capacity per city level** — fixes unit spam, deepens leveling, one rule.
3. **A scoped building set** (Lumber Hut, Farm, Mine + one adjacency building) — brings the placement puzzle without nine building types.
4. **Ruins that reward examination** — we are already remodeling ruin visuals in v34; making them interactive is a small step with outsized exploration payoff.
5. **Tech cost scaling with city count** — cheap anti-snowball lever validated by the original.

**Tier 2 — strong candidates (retention and depth):**
6. **Tasks/bonus objectives with monument rewards** — the most-praised depth-per-rule feature in the original.
7. **A timed score-race mode ("Perfection") with weekly leaderboard reset** — pairs with our existing leaderboard and challenge infrastructure.
8. **Giant-class super unit via max-level city reward** — capstone for the new economy.

**Tier 3 — polish and later:**
9. Per-tribe ambient music layers; naval upgrade tiers; roads/connections; explorer unit; disband.

**Deliberately skip:** Cloak/stealth units (community consensus: tedious), mirror-matchup random lobbies without tribe bans, and any Cymanti-style faction that breaks the shared-rules symmetry — our faction uniqueness comes from single units and passives, which is far easier to keep balanced.

**Where Sunder is already ahead:** story campaign with star ratings and rewards, heroes, asymmetric victory paths, world events, Tribe Forge, coalitions, daily challenges, the AI playtest lab, and an Impossible AI that does not cheat. These are our differentiation — the gap-closing above is about matching Polytopia's economic depth, not copying its identity.

---

## References

[1]: https://polytopia.fandom.com/wiki/City "Polytopia Wiki — City, Population, City Upgrades"
[2]: https://www.thegamer.com/battle-of-polytopia-review/ "TheGamer — The Battle Of Polytopia Review (3/5)"
[3]: https://www.reddit.com/r/Polytopia/comments/18co64r/can_we_admit_that_polytopia_has_a_serious_problem/ "r/Polytopia — Cymanti dominance and tribe-ban requests"
[4]: https://cogconnected.com/review/battle-polytopia-review/ "COGconnected — Battle of Polytopia Review (85/100)"
[5]: https://www.reddit.com/r/Polytopia/comments/181x4do/they_ruined_the_game/ "r/Polytopia — update backlash thread"

- [1] [Polytopia Wiki — City / Population / City Upgrades](https://polytopia.fandom.com/wiki/City)
- [2] [TheGamer — The Battle Of Polytopia Review](https://www.thegamer.com/battle-of-polytopia-review/)
- [3] [r/Polytopia — "Can we admit that Polytopia has a serious problem?"](https://www.reddit.com/r/Polytopia/comments/18co64r/can_we_admit_that_polytopia_has_a_serious_problem/)
- [4] [COGconnected — The Battle of Polytopia Review](https://cogconnected.com/review/battle-polytopia-review/)
- [5] [r/Polytopia — "They ruined the game"](https://www.reddit.com/r/Polytopia/comments/181x4do/they_ruined_the_game/)
