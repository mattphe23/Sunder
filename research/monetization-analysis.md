# Monetization Strategy for a Polytopia-Style Game: In-Game Purchases vs. Upfront Purchase

This analysis compares the two fundamental revenue models for our Polytopia-inspired strategy game — free-to-play with in-game purchases versus a one-time upfront purchase — and recommends a path informed by three inputs: the economics of each model, how Polytopia itself monetizes (and where that created player backlash), and the specific design values we committed to earlier in this project (fair, non-pay-to-win factions).

## 1. How Polytopia Itself Makes Money — and What We Can Learn

Polytopia uses a **capped freemium** model that is widely praised as one of the fairest in mobile gaming. The base game is free with four tribes; additional tribes and cosmetic skins are one-time, non-consumable purchases priced at $0.99–$3.99, with total possible spending capped around $35. Midjiwan's CEO describes the philosophy as targeting "minnows instead of whales": earn a little from a very large, loyal player base rather than extracting heavily from a few ([Gamesforum interview, 2025][1]).

This model has been financially successful — but our complaint research showed its hidden cost. Because the *paid* special tribes (Cymanti, Elyrion) are also the *strongest*, the community's loudest grievance is pay-to-win imbalance in multiplayer. The monetization design directly created the game's biggest reputational problem. Any model we choose must not sell gameplay power.

## 2. The Two Models Compared

| Dimension | Free + In-Game Purchases (F2P/IAP) | Upfront Purchase (Premium) |
|---|---|---|
| Audience size | Very large — no barrier to entry; essential for viral/web distribution | 10–100x smaller; players hesitate to pay before trying |
| Revenue per player | Low average, long tail; steady stream if content keeps flowing | Fixed one-time payment (e.g., $5–$15) |
| Revenue timing | Continuous, grows with engagement and content updates | Front-loaded at launch, decays sharply after |
| Design pressure | Risk of pay-to-win or grind-gating if done badly; must design "wantable" content | None — game can be purely fun-optimized |
| Player trust | Fragile; earned only with transparent, non-consumable, cosmetic-first purchases | High by default ("I paid, I own it") |
| Ongoing obligation | High — players expect regular content to justify spending | Lower, but updates drive word-of-mouth |
| Fit for a web game | Strong — web games live on frictionless access | Weak — paywalled browser games rarely convert |
| Examples | Polytopia (capped IAP), Clash Royale (aggressive) | Monument Valley, Minecraft, Balatro |

### The economics in brief

Free-to-play wins on reach: removing the upfront cost typically multiplies installs by one to two orders of magnitude, and even a 2–5% payer conversion on a large base outearns premium in most mobile markets — IAP revenue dwarfs both ads and premium sales industry-wide. Premium wins on simplicity and trust: 100% of your players are customers, there is no design distortion, and a polished niche title (Balatro is the current touchstone, cited approvingly by Midjiwan's own CEO) can be very profitable. The catch is discoverability: premium relies on reviews, wishlists, and marketing to convince buyers sight-unseen, which is brutal for an unknown indie — and nearly impossible for a browser game, where the norm is instant free play.

## 3. Recommendation: Capped Freemium, Cosmetics-First — "Fair by Design"

For this game specifically — a browser-based, single-player-first strategy title from an unknown brand — a **free-to-play core with fair, non-consumable purchases** is the clear fit, with one hard rule that fixes Polytopia's mistake:

> **Never sell power.** Everything that affects gameplay balance (all four factions, all techs, all units, all difficulties) ships free. Purchases are cosmetic, content-expanding, or convenience-neutral.

A concrete tiered structure:

| Tier | Item | Price | Notes |
|---|---|---|---|
| Free core | 4 factions, full tech tree, 3 AI difficulties, standard maps | $0 | The complete competitive game |
| Cosmetics | Faction skins, terrain themes (winter, desert, neon), unit visual sets | $0.99–$2.99 | Polytopia-style non-consumables; the workhorse revenue |
| Content packs | New map types (archipelago, canyon), scenario/puzzle packs, map editor | $1.99–$3.99 | Adds breadth, not power |
| Supporter pass | One-time "Founder's Pack": all current+future cosmetics, name in credits | $9.99–$14.99 | Captures premium-minded fans; acts as the de facto "buy the game" option |
| Spending cap | Total catalog capped (~$30) | — | Transparency pledge, marketed openly as anti-whale |

This hybrid captures the best of both worlds: the reach of free-to-play, plus a Supporter Pass that effectively *is* the upfront-purchase option for players who prefer paying once. Ads are deliberately excluded — they poison the premium feel of a strategy game and pay poorly for small player bases anyway; at most, a single optional "watch to unlock a bonus cosmetic" slot could be tested later.

### Why not pure upfront purchase?

A $10 paywall on an unknown browser strategy game would suppress the player base to near zero before word-of-mouth could form. Premium works for games with existing brand gravity or platform storefronts (Steam wishlists, App Store features). If the game later graduates to Steam or mobile app stores, a **premium SKU** ($9.99 with all cosmetics included) alongside the free web version is a proven expansion path — the web version becomes the demo funnel.

### If multiplayer is ever added

The no-power rule becomes non-negotiable: ranked play must be perfectly symmetric in purchasable content, or we recreate the exact Cymanti resentment that our research identified as Polytopia's biggest community wound.

## 4. Revenue Model Summary

In expectation: F2P web distribution maximizes the top of the funnel (players), cosmetics and content packs convert an industry-typical 2–5% of engaged players at low price points, the Supporter Pass captures the 0.5–1% of premium-minded fans at ~$12, and a future Steam/mobile premium SKU adds a second front-loaded revenue wave — all without ever selling a gameplay advantage, preserving the trust and community goodwill that Midjiwan proved is itself a durable competitive asset.

## Sources

[1]: https://www.globalgamesforum.com/news/the-battle-of-polytopias-fight-against-pay-to-win "Gamesforum: The Battle of Polytopia's Fight Against Pay-to-Win (Midjiwan CEO interview, 2025)"

Additional sources: Adapty, "Top 7 mobile game monetization models in 2026"; Unity in-app purchases guide; Steam community pricing discussions for Polytopia; r/Polytopia monetization threads; our earlier complaint research (research/research-summary.md).
