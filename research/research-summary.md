# Making a Better Polytopia: Player Complaints, Copyright Boundaries, and Our Design Response

This document summarizes research conducted before building our Polytopia-inspired strategy game. It covers two questions: what players most dislike about The Battle of Polytopia, and how similar a new game can legally be to it. Each finding is paired with the concrete design decision we are taking in response.

## Part 1: What Players Complain About

The Battle of Polytopia is widely loved — it holds strong review scores and a devoted community — but recurring criticisms surface consistently across Reddit (r/Polytopia), Steam discussions, and professional reviews. The complaints cluster into five themes.

### 1.1 Faction imbalance and the "Cymanti problem"

The single loudest complaint in the community concerns tribe balance in multiplayer. Long-time players report that the paid special tribe Cymanti came to represent an estimated 40–70% of opponents on small maps, with games devolving into the same defensive pattern every time: "every single game is just fending off boosted hexapods and desperately trying not to let the centipedes they rush to build out of control. This is no longer fun" ([Reddit, ~4,000-game veteran][1]). A dozen linked community threads beg the developer for the ability to disable specific tribes in matchmaking. Because the strongest tribes are paid DLC, this also feeds a pay-to-win perception.

> **Our response:** All four factions in our game are free and asymmetric by design — each has one distinct passive bonus and a different starting technology, tuned to comparable power. No faction is locked behind payment, and balance is a first-class design goal rather than a monetization casualty.

### 1.2 Base-game tribes are nearly identical

Paradoxically, while the special tribes are too different, the classic tribes are criticized for being too similar. Cubed3's review calls it "one egregious flaw... all the races (excluding the DLC one) are exactly the same. They start with one different technology, which is nothing more than a single turn of research away. It is a hugely missed opportunity" ([Cubed3, 6/10][2]).

> **Our response:** The asymmetric passives above give each faction a genuinely different opening and mid-game texture (cheaper research, stronger attacks, cheaper harvesting, faster movement) without the runaway extremes of Polytopia's special tribes.

### 1.3 The late game "is a disaster"

Reviewers and players agree the game's simplicity stops scaling after the midgame. Tech, city upgrades, and units max out early; star income floods; and matches decay into what Cubed3 describes as "a strange game of WW1-style trench warfare... like trying to assault the Maginot Line without tanks," with catapult spam dominating. Reddit threads echo that post-turn-30 play becomes repetitive drudgery.

> **Our response:** Three structural fixes. First, technology costs scale with empire size, so research remains a meaningful decision into the late game. Second, capital-capture is a decisive victory condition — games end when a knockout blow lands rather than dragging on. Third, matches are capped at 30 turns with score victory as the fallback, so every game ends crisply. Ranged units are deliberately fragile (low defense, no retaliation) so melee assaults remain viable against catapult lines.

### 1.4 The AI is too easy and incomplete

Single-player veterans report that even the "Crazy" difficulty stops challenging them: "everytime I get so powerful that it gets boring... the bots never make cannonboats, catapults etc." ([Reddit][3]). The AI fails to use the full unit roster and does not scale.

> **Our response:** Our AI plays the same game the player does — it expands, harvests, researches its faction's tech path, and trains the full unit roster including ranged units. Three difficulty levels adjust its economic bonuses and aggression rather than just its blindness.

### 1.5 Spawn and early-game luck

Players complain that rush strategies succeed or fail "entirely based on luck of spawn," and that early ruin rewards can decide games.

> **Our response:** Capitals spawn on an evenly spaced ring with guaranteed starting resources within their borders, and villages are distributed with minimum-distance constraints, reducing positional lottery.

A sixth complaint cluster — multiplayer server outages and opponents who stall rather than resign — is avoided entirely because our game is a fast, fully client-side single-player experience.

## Part 2: Copyright — How Similar Is Too Similar?

### 2.1 The legal framework

US copyright law draws a firm line through the **idea–expression dichotomy**. The Copyright Office states plainly that "copyright does not protect the idea for a game, its name or title, or the method or methods for playing it... nothing in copyright law prevents others from developing another game based on similar principles." Courts have repeatedly held that game rules, mechanics, scoring systems, grid boards, and win conditions are unprotectable ideas; only **expression** — art, characters, names, music, code, and overall audiovisual "look and feel" — is protected ([Frankfurt Kurnit, Law360][4]).

Three cases define the practical boundaries:

| Case | Outcome | Lesson |
|---|---|---|
| *Tetris Holding v. Xio* (2012) | Clone lost | Copying look-and-feel (piece styles, colors, board dimensions, animations) infringes even with rewritten code and self-made assets. "If one has to squint to find distinctions... the works are likely substantially similar." |
| *Spry Fox v. 6Waves* (Triple Town/Yeti Town, 2012) | Settled after clone's motion to dismiss failed | A bare reskin with identical mechanics and structure carries real litigation risk. |
| *DaVinci v. Ziko* (Bang!, 2016) | Clone won | Identical rules with genuinely different theme, names, and visual design did not infringe — rules merely "create the environment for expression." |

The *Tetris* court pointed to *Dr. Mario* as the lawful model: it borrows Tetris's falling-block idea wholesale but expresses it with original visuals, characters, and identity. Separately, **trademark law** protects names and trade dress — "Polytopia" itself, its tribe names (Imperius, Bardur, Cymanti...), and its logo — regardless of copyright.

### 2.2 What this means for our game

There is meaningful risk only if we imitate Polytopia's *expression*. We are therefore free to build a turn-based 4X on a square grid with a star economy, tech tree, city leveling, fog of war, and a 30-turn score mode — these are unprotectable mechanics used across the whole genre. What we must not do, and will not do, is copy its art style pixel-for-pixel, reuse its name or tribe names, mimic its exact UI trade dress, or market the game with reference to Polytopia.

Our safeguards, already reflected in the design:

1. **Original identity:** the game ships as "Polyforge" with its own logo, wordmark, and no in-game reference to Polytopia.
2. **Original faction names and lore:** Auren, Kharzul, Sunwei, and Vessari replace any borrowed tribe names. Generic medieval unit terms (Warrior, Archer, Knight) are industry-standard scenes à faire and safe.
3. **Original art direction:** true-3D faceted low-poly terrain rendered in Babylon.js with our own "Isoglow" palette — visually distinct from Polytopia's flat pastel style at a glance, no squinting required.
4. **Original UI and code:** every line of code, layout, and asset is created fresh for this project.
5. **Divergent gameplay:** the improvements from Part 1 (asymmetric passives, scaling tech costs, decisive endings, stronger AI) make this a genuinely different game rather than a reskin — the *Dr. Mario* position, the safest ground a genre successor can occupy.

## Sources

[1]: https://www.reddit.com/r/Polytopia/comments/18co64r/can_we_admit_that_polytopia_has_a_serious_problem/ "Reddit: Can we admit that Polytopia has a serious problem?"
[2]: https://www.cubed3.com/games/reviews/pc/battle-of-polytopia "Cubed3: The Battle of Polytopia Review"
[3]: https://www.reddit.com/r/Polytopia/comments/p3roij/is_the_game_a_bit_too_easy_even_on_crazy/ "Reddit: is the game a bit too easy? (even on crazy)"
[4]: https://fkks.com/news/how-courts-view-copyright-protection-for-video-games "How Courts View Copyright Protection For Video Games (Law360)"

Additional sources consulted: r/Polytopia threads 17uww5g ("Is anyone getting tired of this game?") and 1emwrp5 ("A Game of Tiny Troubles"); Tetris Holding, LLC v. Xio Interactive, Inc., 863 F.Supp.2d 394 (D.N.J. 2012) via Wikipedia; Stephen McArthur, "Clone Wars: The Five Most Important Cases Every Game Developer Should Know," Game Developer (2013); TheGamer and NintendoWorldReport reviews.
