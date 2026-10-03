# Landscape: code-first coastline v1 — review pilot

**Status: opt-in development review only. Not approved as Sunder's default landscape.** The owner changed priority on 2026-10-03 to explore landscape while Scenario character generation is paused; this does not mark Vessari Szara or Dravok Borvak complete.

## Why this route instead of Scenario

The existing board is already a live, deterministic Babylon scene with five terrain types, four biome palettes, procedural trees/mountains, fog and picking. Generating each shoreline or tile as a separate image/3D asset would introduce repeated paid jobs, style mismatch across neighbors, storage/download cost and awkward tile seams. This pass changes only a few cached-material Babylon boxes at **visible coast edges**; it requires no Scenario generation, external binary or third-party art.

The existing pale shore/sand/rock strips were computed in a land slab's **local** coordinates using a water **world** height. On the actual archipelago board their accents sat below the visible blue water surface. `coastBandLocalY` explicitly converts a waterline-relative elevation to slab-local coordinates. A narrow shallow-colored shelf sits on the neighboring **water** tile, so the transition is visible from above without a texture. Its material is derived from the active biome palette. No tile data, biome generation, movement, combat, economy, unit model, picking target or ordinary shader is changed.

## Review gate and limits

- Development preview: `/?devgame=6104,11,4,archipelago&landscape-pilot=coast-v1` (Nerivane, deterministic seed). Only an exact `landscape-pilot=coast-v1` with `devgame` and `import.meta.env.DEV` enables the experiment. The production build and unflagged games retain the original coast.
- Render the shelf only where **both** the water tile and its neighboring land tile are explored and currently visible to the human player; unexplored terrain is not disclosed. New meshes are non-pickable children of the existing tile and follow board disposal/freezing. The original unit assets remain procedural unless their separate explicit review flags are used.
- This is a **single coast treatment**, not a whole-map polish pass. Fog clouds, terrain tile seams, cities, biomes, land vegetation and mountain silhouettes are deliberately unchanged. The light rim can look high-contrast next to deep ocean; owner aesthetic judgment remains open.

## Genuine same-seed comparison

Screenshots were captured from the running Babylon game, not mockups. All evidence lives **outside Git** in `/home/ubuntu/sunder-art-pipeline/landscape/coast-v1/review/`:

| Evidence | Unflagged original | Opt-in coastline |
| --- | --- | --- |
| 1392×976 archipelago, seed 6104 | `before-archipelago-6104.png` | `pilot-archipelago-6104.png` |
| 430×932 phone aspect, same seed | `before-archipelago-6104-mobile.png` | `pilot-archipelago-6104-mobile.png` |
| 1392×976 highlands no-visible-coast control | `before-highlands-6104.png` | `pilot-highlands-6104.png` |

The archipelago had nine visible coastal land tiles. The opt-in screenshot shows the shallow-colored edge and elevated pale line where the unflagged screenshot has a flat deep-blue boundary. Mesh count at the same seed/camera was **595 unflagged versus 600 opt-in** (+5 net scene meshes); total vertices **124,192 versus 124,312** (+120) and indices **133,044 versus 133,224** (+180). Nine shelf children were observed; four other existing shore-edge meshes were omitted at hidden-neighbor boundaries under the pilot's fog guard. The highlands control had no visible coast and **zero** pilot meshes, with identical scene totals in both modes. Both desktop and mobile captures had one ordinary hero, zero imported-GLB requests and zero page errors. These are scene measurements, not full-device FPS benchmarks.

## Validation and review decision

- `pnpm check` and focused Vitest for palette + landscape pilot passed (8 tests across 2 files). `CI=true pnpm test` passed **302 tests in 36 files**. `NODE_OPTIONS='--max-old-space-size=2048' pnpm build` and `git diff --check` passed; Vite reported the pre-existing large-chunk warning.
- Same-seed unflagged archipelago capture after implementation retained the exact pre-edit mesh/vertex/index totals and showed **no pilot nodes**.
- Scope is only the renderer, a small pure gate/elevation helper, its test and this note. No media, model files or Scenario assets are tracked.
- GitHub commit and managed checkpoint identifiers are reported in the delivery record after publication rather than guessed in this prepublication document.

**Decision remains review-only.** The owner decides whether to adopt, adjust or reject this look after comparing the paired screenshots. Szara's four prepared P2 views remain archived; no Szara P2 job has been accepted. Borvak has only a front/three-quarter reference and remains on source-QA hold. Neither character is silently replaced, and no broad landscape cleanup is claimed.
