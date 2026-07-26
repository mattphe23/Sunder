# Sunder — Character Modeling Guide (handoff notes)

This document is for anyone working on unit/character visuals. It explains where the
models live, how they are rendered, and the two supported paths for upgrading them.

## Where things live

| File | Role |
|---|---|
| `client/src/game/render/characters.ts` | **All unit models.** Procedural Babylon.js mesh builders — one entry point `buildCharacter()` assembles each unit class from primitives (boxes, cones, cylinders, wedges). Includes the v42 Nerivane spec builders (mask heads, crest hierarchy, prism bow, half-body shield, aquatic mount, trident, hero crown/cape/banner). |
| `client/src/game/render/palette.ts` | Central color palette — tribe colors, terrain values, material shades. Colors are the "materials" (flat/emissive, no textures). |
| `client/src/game/render/scene.ts` | Board scene — unit placement/scaling, tile picking, selection fissure overlay, fog, terrain, post-processing. |
| `client/src/game/render/portraits.ts` | Portrait pipeline — renders any unit mesh to transparent PNG masters (orthographic 3/4, shared feet baseline) + runtime WebP sizes. |
| `client/src/pages/ModelLab.tsx` | `/model-lab` acceptance page — live 40px color/grayscale + 8-angle sweeps for every Nerivane class. Any change to `characters.ts` shows up here instantly (Vite HMR). |

## Art direction (locked by the design team)

- Low-poly, flat-shaded, color-as-material (no texture maps). Polytopia-figurine feel.
- Shared across ALL tribes: faceted mask-face, body proportions, camera, shading,
  fractured hex base convention (fissure is a tile-level overlay, not per-unit).
- Tribe-specific: crests, armor geometry, equipment, materials/palette.
- Crest hierarchy: short crests for common units; tall/elaborate crests reserved for
  the unique unit and the hero.
- Budgets: ≤900 tris foot unit / ≤1200 hero / ≤1500 mounted; ~12 mesh groups common,
  ~16 hero/mounted. Share cached materials; one emissive accent material per tribe.
- **Acceptance test:** class identity must survive at ~40px tall, in color, grayscale,
  and all eight 45° rotational views. Use `/model-lab` to check.

## Two upgrade paths

1. **Extend the procedural builders** (current approach): keep editing
   `characters.ts`. Zero asset weight, animates for free (transform-based hop/attack
   animations in `scene.ts` need no skeletons).
2. **Authored `.glb` assets**: model in Blender etc., load via Babylon's glTF loader.
   `buildCharacter()` is the single entry point — swap its internals per class and the
   board, portraits, and Model Lab all pick it up automatically. If you go this way:
   keep meshes `isPickable = false` (tile picking depends on it), keep the feet on
   y=0, keep overall height ≈ the current rigs (~0.55–0.6 world units; hero 1.08×),
   and prefer flat/emissive materials to match the board's unlit look.

## Local development

```bash
pnpm install     # Node 22+, pnpm
pnpm dev         # dev server; open /model-lab for the acceptance grids
pnpm test        # vitest suite (159 tests)
pnpm check       # type-check
```

Note: server features (online duels, leaderboards) need env vars that only exist in
the Manus hosting environment; the solo game and Model Lab run fine without them.
