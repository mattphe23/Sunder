# Sunder landscape review v2 — three independent code-first passes

**Decision: development-only review variants, not owner-approved/default landscape.** The owner authorized switching to landscape while Scenario character work is paused. This report extends [coast-v1](LANDSCAPE-COAST-V1-REVIEW.md) with fog readability, settlement-aware forest density, and mountain silhouettes. No Scenario compute job, generated tile asset, texture or model binary was used or added to Git. Vessari Szara and Dravok Borvak remain unfinished.

## How to compare

Use the existing development-only `devgame` route with one exact `landscape-pilot` slug. Each feature has its **own independent flag**, so comparison does not confound the other features. `review-v2` combines the three new treatments and coast-v1 for an overall board review. These flags require both `import.meta.env.DEV` and `devgame`; the production build and ordinary unflagged matches continue using the pre-existing renderer.

| Variant | Fixed game URL query | Scope |
| --- | --- | --- |
| Original | `?devgame=6104,11,4,highlands` | Default, unchanged |
| Fog only | `?devgame=6104,11,4,highlands&landscape-pilot=fog-v1` | Unexplored cloud meshes only |
| Forest only | `?devgame=6104,11,4,archipelago&landscape-pilot=vegetation-v1` | Forest tree and underbrush counts only |
| Mountains only | `?devgame=6104,11,4,highlands&landscape-pilot=mountain-v1` | Selected mountain mesh dimensions only |
| Combined | `?devgame=6104,11,4,archipelago&landscape-pilot=review-v2` | Three new variants plus coast-v1 |

All PNGs and capture JSON live **outside the repository**, under `/home/ubuntu/sunder-art-pipeline/landscape/review-v2/screenshots/`, and were captured from the actual Babylon game at seed 6104. The reproducible Playwright harness is `/home/ubuntu/sunder-art-pipeline/landscape/review-v2/capture-landscape.mjs`. Matched captures use the same preset, selected tile, camera angle and desktop 1392×976 or phone 430×932 viewport. Screenshots represent review evidence, not sprite replacements.

## Findings and risks

| Treatment | Actual change | Same-seed evidence | Limitation requiring owner judgment |
| --- | --- | --- | --- |
| Fog | Four deterministic puffs per unexplored tile become three 0.87-scale, muted puffs; the opaque pick slab and explored/visible logic stay intact. | Highlands original `before-highlands-6104-fog-desktop.png` versus `fog-v1-highlands-6104-fog-desktop.png`, plus matched phone captures. Same 549 scene meshes; **128,380 → 99,280 vertices**, 136,032 → 106,932 indices. Both modes retain **97 opaque fog slabs for 97 unexplored tiles**. | Cloud cover remains unmistakable but the lighter negative space may feel flatter; no hidden terrain is disclosed. |
| Vegetation | Forests within one tile of any settlement keep two trees and sparse underbrush; more remote forests have at most three trees and slightly fuller underbrush. Existing palm, acacia, pine and conifer geometry/palettes remain. Grass decoration is untouched. | Archipelago original `before-archipelago-6104-forest-desktop.png` versus `vegetation-v1-archipelago-6104-forest-desktop.png`, plus matched phone captures. Same-seed **595 → 593 meshes**, 124,192 → 123,984 vertices. Also checked pine-biome highlands. | Intentionally subtle; the owner may prefer denser capital-side forests. This does not solve every tree/hero overlap on every map. |
| Mountains | A deterministic subset of each biome's mesa/crag/classic mountains becomes lower and broader; remaining peaks preserve the original tall family. No new meshes, recolors or logical elevation changes. | Highlands original `before-highlands-6104-mountain-desktop.png` versus `mountain-v1-highlands-6104-mountain-desktop.png`, plus matched phone captures. Mesa-family archipelago was also checked. **Mesh, vertex and index counts remain identical** at seed 6104. | Silhouette variety is modest; some mountain clusters still compete visually with heroes. |
| Combined | Coast + fog + forest + mountain, only with `review-v2`. | Archipelago `before-archipelago-6104-forest-desktop.png` versus `review-v2-archipelago-6104-forest-desktop.png`; highlands `before-highlands-6104-mountain-desktop.png` versus `review-v2-highlands-6104-mountain-desktop.png`, both with corresponding mobile views. Archipelago **595 → 598 meshes**, 124,192 → 96,804 vertices; highlands **549 → 549 meshes**, 128,380 → 99,154 vertices. | The coast-v1 pale band remains bright against deep water. The fog/cloud pattern remains repetitive at distance. Full-device FPS has not been measured. |

## Invariants and validation

- An **unflagged game after all edits** reproduced the pre-edit scene counts exactly on both deterministic boards: archipelago 595 meshes / 124,192 vertices / 133,044 indices; highlands 549 / 128,380 / 136,032. Both retain one procedural hero, zero imported preview nodes, zero `.glb` requests and zero page errors.
- On all matched combined captures, there were **91 opaque fog slabs for 91 unexplored archipelago tiles** and **97 for 97 highlands tiles**; the review does not reveal unseen terrain or alter fog rules.
- `pnpm check`, focused landscape tests, `CI=true pnpm test` (**305 passed across 36 files**), `NODE_OPTIONS='--max-old-space-size=2048' pnpm build` and `git diff --check` passed. Vite's existing large-chunk advisory persists; these are browser scene counts, not mobile-silicon frame-rate measurements.
- Individual source changes were fast-forward pushed to GitHub main in sequence: fog `b902fad`, vegetation `3d85da7`, mountain `8b52d13`. No force push or media commit. GitHub main remains authoritative; the managed WebDev checkpoint is saved only after publication.

**Next decision:** Compare the genuine captures before choosing which, if any, should graduate to ordinary gameplay. Do not call this an approved art pass, a completed landscape cleanup, or TestFlight readiness. Scenario character generation remains paused without consuming another accepted job.
