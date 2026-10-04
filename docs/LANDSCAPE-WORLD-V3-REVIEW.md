# Sunder landscape world-v3 — reference-informed review candidate

**Review-only. Not an approved replacement for ordinary gameplay.** This is an original procedural/Babylon composition study inspired by high-level principles observed in published [Polytopia gameplay screenshots](https://www.play-asia.com/en/the-battle-of-polytopia/13/70enjp) and the developer's [official game overview](https://polytopia.io/) and [official Google Play gallery](https://play.google.com/store/apps/details?id=air.com.midjiwan.polytopia&hl=en_US). The study copies **no** Polytopia image, mesh, texture, color table, character, icon or source code. Two third-party screenshots used during visual inspection are kept outside the repository at `/home/ubuntu/sunder-art-pipeline/landscape/world-v3/references/`, with their source names retained. Neither screenshot ships with Sunder.

## What the screenshots taught us

At a whole-board viewing distance, visual structure comes from **larger connected regions** of land/water, a **small-scale rhythm** of trees and ground markings within those regions, and a **narrow, legible coast**. Sunder's earlier close-up showed its land largely as isolated flat slabs with tall individual props, a very bright pale shoreline and repeating round cloud blobs. The point is to translate the hierarchy, **not** reproduce Polytopia's square-world illustration. Sunder retains its indigo void, cool mist, fractured world/forge materials, hero-first hierarchy, tribe-colored borders and biome-specific silhouettes.

## Development-only preview

The exact opt-in route is `?devgame=6104,11,4,archipelago&landscape-pilot=world-v3` (change `archipelago` to `highlands`, `continents` or `pangaea` for other map presets). It includes the earlier coast/fog/vegetation/mountain review treatments plus these independently new v3 touches:

1. **Connected groves and ridge bases.** Thin, non-pickable same-biome connectors join only *currently visible* forest–forest and mountain–mountain neighbors, not hidden tiles, ownership changes, roads, cities or water. Three low, five-sided shrubs under each visible forest strengthen the grove read without enlarging the trees or blocking the hero lane.
2. **Subdued region rhythm.** A deterministic three-cell tone plan adds only modest ±5–7% value steps to *visible* grass/forest surfaces. Two flat pentagonal ground facets are placed only on visible, featureless grass. Resource, road and city tiles are excluded from facets, and no terrain type, movement or explored state changes.
3. **Quieter land–water transitions.** The previous shoreline is still present but less luminous, with a slimmer shallow shelf and muted sand. It uses each Sunder biome's own swatches, not the reference game's colors.
4. **Faceted ash mist.** Six-sided low-poly mist replaces the *shape* of world-v3's cloud tops over the existing opaque unexplored-tile slabs; the fog state and tile picking remain unchanged. It is substantially lower geometry than the old rounded clouds.

`landscape-pilot=review-v2` still selects the prior variant, not v3. Only a development build **with an explicit `devgame` parameter** may activate v3. Ordinary games and production builds preserve the original renderer. No Scenario job, AI-generated tile art, imported GLB or binary asset is involved.

## Authentic comparison evidence

The external Playwright/Babylon harness `/home/ubuntu/sunder-art-pipeline/landscape/world-v3/capture-world.mjs` captured the **same seed 6104, tribe index 4, target tile, camera and viewport** in original, prior-v2 and v3 modes. Desktop evidence is 1392×976; phone is 430×932. Capture PNGs and JSON reports are outside Git in `/home/ubuntu/sunder-art-pipeline/landscape/world-v3/review/`.

| Preset/focus | Original | Previous review | New study | Practical read |
| --- | --- | --- | --- | --- |
| Archipelago / forest | `before-archipelago-6104-forest-desktop.png` | `review-v2-archipelago-6104-forest-desktop.png` | `world-v3-archipelago-6104-forest-desktop.png` | More coherent grove floor and quieter pale rim; palm trunks and city still dominate the occupied center. |
| Highlands / mountain | `before-highlands-6104-mountain-desktop.png` | `review-v2-highlands-6104-mountain-desktop.png` | `world-v3-highlands-6104-mountain-desktop.png` | Ridge bases read a little more like a range; tall spires still sometimes compete with hero silhouettes. |
| Both / phone | Matching `*-mobile.png` for original and v3; archipelago also includes prior-v2 |  |  | Test on a real handset remains outstanding. |
| Other biomes |  |  | `world-v3-continents-6104-fog-desktop.png`, `world-v3-pangaea-6104-fog-desktop.png` | Temperate and savanna palettes retain separate color identity. |

The archipelago original has **595 meshes / 124,192 vertices / 133,044 indices**; prior v2 has **598 / 96,804 / 105,552**; v3 has **623 / 40,390 / 61,608**. Highlands original has **549 / 128,380 / 136,032**; prior v2 **549 / 99,154 / 106,632**; v3 **565 / 38,598 / 58,848**. The fog-top geometry drives most of that vertex reduction; added region connectors cause a small mesh-count increase, **not** a proved mobile FPS improvement. On all paired archipelago views, all **91 unexplored tiles have fog slabs**; highlands all **97 of 97**. One procedural hero, zero imported preview nodes, zero candidate GLB requests and zero browser page errors were observed in each control. After all code changes, unflagged scene counts matched the prior baseline exactly on both presets.

`pnpm check`, focused landscape/palette tests, `CI=true pnpm test` (**308 passed / 36 files**), bounded-memory production build and `git diff --check` pass. The existing Vite large-chunk advisory remains. This is a **visual review candidate**: the board still has visible tile seams and a repetitive distant fog pattern. Owner judgment should decide whether this direction earns another pass or whether to prioritize board framing/denser authored landmarks. Neither full roster completion nor TestFlight readiness is implied; Scenario's Szara model stage remains paused.
