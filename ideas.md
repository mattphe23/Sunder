# Design Brainstorm — "Polytopia-like" Turn-Based 4X Strategy Game

## Three Candidate Directions

### 1. "Paper Empires"
A tactile, paper-craft diorama aesthetic — the world looks like folded/cut paper tiles on a wooden desk, warm and handmade.
Probability: 0.06

### 2. "Isoglow" (CHOSEN)
Clean low-poly isometric world in the spirit of modern minimalist strategy games — saturated faceted terrain floating in a deep ocean void, crisp geometric units, flat-shaded joy. Emotionally: playful, luminous, inviting — a toy world with real strategic teeth.
Probability: 0.08

### 3. "Inkwar Cartography"
A hand-inked antique map style: parchment background, engraved hatching, units as heraldic tokens. Moody and scholarly.
Probability: 0.04

---

## CHOSEN: "Isoglow" — Expanded Direction

**Design Movement:** Low-poly flat-shaded minimalism (superflat 3D), descending from Monument Valley / Bad North / Polytopia itself — faceted geometry, zero photorealism, color as the primary material.

**Core Principles:**
1. **Color is material** — no textures on terrain; every surface reads through flat saturated color + facet shading.
2. **Toy-world clarity** — every tile, unit, and building must be readable at a glance from the isometric camera; silhouette over detail.
3. **The void frames the world** — the map floats as an island cluster in a deep gradient abyss; negative space is part of the composition.
4. **Juicy economy of motion** — few animations, but each one springy and satisfying (unit hops, city pop-ups, star sparkles).

**Color Philosophy:** A deep indigo-teal ocean void (#0b2740 → #123a5c) makes the saturated land colors glow: grass emerald (#4caf6d), forest pine (#2e7d4f), mountain slate with snow caps, fruit oranges, tribe colors as pure hue accents (imperial blue, crimson, amber, violet). Emotional intent: nighttime board-game glow — focused, cozy, slightly magical.

**Layout Paradigm (UI):** Full-screen game canvas with UI as floating "field HUD" layers — a top resource ribbon (stars, turn, score), a bottom-left contextual action dock that slides in when a unit/city is selected, and a right-edge tech tree drawer. No centered cards; everything hugs the edges to keep the board sovereign.

**Signature Elements:**
1. Faceted hex/square tiles with slightly extruded edges and darker side walls — the "cake slice" look.
2. Star currency with a four-point sparkle motif reused in buttons, capture effects, and the logo.
3. Tribe color banners: each city has a small waving flag; UI panels carry a thin tribe-color top border.

**Interaction Philosophy:** Direct manipulation — tap a unit, see its move/attack range bloom as glowing tile highlights; tap a destination, the unit hops there. Every legal action is always visible; illegal actions simply don't light up. Zero modal dialogs during play.

**Animation:** Unit movement = 220ms parabolic hop with squash-and-stretch. Selection = tile highlight pulse (opacity 0.55→0.8, 1.2s loop). Combat = quick lunge + flash + floating damage number. City capture = flag raise + radial star burst. Turn change = banner slide across top (400ms ease-out). All GPU-friendly (transform/opacity in DOM, position/scale in Babylon).

**Typography System:** Display: "Fredoka" (rounded, chunky, friendly authority) for logo, headers, big numbers. Body/UI: "Nunito Sans" for labels and tooltips. Hierarchy: Fredoka 600 for panel titles, Nunito Sans 400/700 for content. Numbers always tabular.

**Brand Essence:** "Polyforge — a pocket empire in every match." A fast, readable 4X for strategy lovers and newcomers alike; different because it strips 4X to its joyful core. Personality: playful, sharp, luminous.

**Brand Voice:** Confident, light, imperative. Examples: "Your empire awaits its first move." / "Research Archery — strike before they close in." Never "Welcome to our website."

**Wordmark & Logo:** A four-point star inscribed in a faceted hexagon (the star-tile), rendered in amber-on-indigo; wordmark "POLYFORGE" in Fredoka with a slight forward italic on the O counters.

**Signature Brand Color:** Radiant Star Amber `#ffb938` — the color of stars (currency), the logo, and every primary CTA.

---

## Game Design Summary (mechanics scope)

- Square grid (Polytopia-style) rendered isometrically in Babylon.js, 11×11 default map, procedurally generated: ocean, water, grass, forest, mountain; fruit/game/minerals resources; villages to capture.
- 4 tribes (1 human + 3 AI): Imperius (blue), Vengir (crimson), Zebasi (amber), Quetzali (violet) — each starts with a capital city + 1 warrior.
- Economy: stars per turn from cities + resource harvesting; city levels grow via population (resources harvested in city borders).
- Units: Warrior, Archer, Rider, Defender, Swordsman, Catapult, Knight — HP/attack/defense/movement/range per Polytopia formulas.
- Combat: Polytopia damage formula (attackForce/defenseForce ratio), retaliation, defense bonuses in cities/forests(with terrain tech).
- Tech tree: ~16 techs in 4 branches (Riding, Organization, Climbing, Fishing style tiers) unlocking units, harvesting, movement.
- Turn-based: player moves all units, ends turn; AI tribes take actions (expand, harvest, train, attack) via heuristic AI.
- Win: eliminate all enemy capitals or highest score at turn 30.
- Fog of war: tiles hidden until explored (lite version: dimmed unexplored).

## Style Decisions
- Start/setup screens may center the player's first choice, but the composition must still feel like an in-world field HUD over a playable isometric board — never a generic glassmorphic landing form (HUD corner brackets, tribe-color reactive console panel, spark motifs).
- Background world art must remain flat-shaded, saturated, and tile-readable; avoid painterly realism or foggy fantasy atmosphere (brighten/saturate menu art via CSS filters).
- Star Amber `#ffb938` is the primary action and reward color, supported by visible faction hues and emerald terrain so the mood stays luminous rather than merely dark.
- Signature motif: four-point spark (Spark component) + faceted diamond separators (FacetRule) reused across menu, game-over, and HUD.

---

## Research-Driven Design Amendments (July 2026)

### From player-complaint research (see research/complaints-notes.md)
1. **Asymmetric-but-fair factions**: each of the 4 factions gets one distinct passive bonus and unique starting tech — none paywalled, all tuned to similar power; fixes "all tribes identical" AND "OP paid tribes" complaints.
2. **Late-game fixes**: escalating tech costs per city; decisive capital-capture victory; 30-turn score cap so games end crisply; ranged units get low defense and cannot retaliate, so melee counters exist; star income curve kept modest to avoid unit-spam floods.
3. **Better AI**: three difficulty levels; AI uses the full unit roster including ranged units, expands, researches, and prioritizes targets — addressing "bots never build catapults / too easy" complaints.
4. **Less spawn luck**: capitals placed on an even ring with guaranteed starting resources nearby.
5. **Single-player web game**: no servers/stalling opponents by design; instant turns.

### From copyright research (see research/copyright-notes.md)
Mechanics are free to use; expression must be original. We keep the 4X grid/turn/tech mechanics but ship original name (Polyforge), original faction names/lore (NOT Polytopia's tribes — rename Imperius etc.), original art (our 3D faceted style), original UI, and no references to Polytopia in-game.

**Faction renames (replacing earlier placeholder names):**
| Faction | Color | Passive | Starting tech |
|---|---|---|---|
| Auren | Imperial Blue #3d7bff | Scholars: techs cost 10% less | Organization |
| Kharzul | Crimson #e04747 | Forgeborn: +10% attack | Hunting |
| Sunwei | Amber #ffb938 | Harvesters: harvesting costs 1 less star | Climbing |
| Vessari | Violet #9d5ce8 | Outriders: units +1 movement on grass roadsless | Riding |
