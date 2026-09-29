# Nerivane Archer P2 Repeatability Pilot

## Decision status

**Review candidate — technically accepted, awaiting the user's visual approval.**

The Archer demonstrates that the approved Scenario Tripo P2 Warrior workflow can repeat across a second class without collapsing back into the procedural block-figure look. It retains the same tapered silhouette, faceted bone mask, pale aqua crest, layered teal armor, and fractured stone base while establishing a readable Archer identity through the tall recurve bow and back quiver.

This does **not** replace the production Archer yet. The existing gameplay model remains the default. Both the Model Lab and real-board comparison are opt-in review paths.

## Reproducible pipeline

1. Isolate the Archer from `Sunder-Nerivane-Pilot-Lineup-v1.png` and remove neighboring lineup fragments without redesigning the character.
2. Generate one four-view orthographic turnaround in a duplicated Scenario Turnaround Studio workflow using the locked Sunder specification.
3. Validate the turnaround at full resolution and approximately 40 pixels tall before spending 3D-generation credits.
4. Feed front, left, back, and right views into Scenario's `model_tripo-p2-multiview-to-3d` model.
5. Generate a textured PBR GLB with delight enabled, original-image texture alignment, default orientation, auto-size disabled, and quad disabled.
6. Audit the GLB, upload it to deployment-safe WebDev storage, and render it through the same Babylon.js normalization and portrait pipeline as the approved Warrior.
7. Compare against the procedural Archer at full size, 40-pixel color and grayscale, eight angles, approximate occupied-hex scale, and on the actual game board.

## Scenario record

- Turnaround workflow: `wflow_DB4P34Dm1kzJAJJtjJ9gk6sY`
- Turnaround output: `asset_TxHrfJEZg2WE5LtnqqqykYHN`
- Front input: `asset_q9svEvDLqQzQzWB2ywWEf6Uq`
- Left input: `asset_SgakMvhqgGmsTmMw9aqQwxkA`
- Back input: `asset_Fpv42NHLwn3PgxT8RXV2haGz`
- Right input: `asset_9RgnDwkBFZLkrBFdXVVEoUcj`
- Tripo job: `job_DMMaP2zm8FUdAXUQXh1nAjHi`
- Tripo output: `asset_dZ5ekBi5ta4RuMv642v4kEwg`
- Geometry seed: `1527194074`

## Audited runtime metrics

| Metric | Archer P2 v1 |
|---|---:|
| GLB size | 2,788,280 bytes (2.66 MiB) |
| Vertices | 7,011 |
| Triangles | 4,797 |
| Runtime primitives / draw calls | 1 |
| Materials | 1 |
| Embedded textures | 3 |
| Texture resolution | 2048 × 2048 |

The geometry and file size pass the established imported-unit pilot limits. A single runtime primitive is especially favorable for board scenes containing multiple units. The 2048-pixel PBR texture set is acceptable for the review pilot but should be tested at 1024 pixels during production optimization; most of its detail is not visible at normal board scale.

## Visual verdict

### What works

- The model immediately belongs beside the approved P2 Warrior.
- The faceted mask, long crest, narrow waist, pointed lower armor, and muted teal palette survive the 3D conversion.
- Bow and quiver create a clear class silhouette from front, profile, and rear angles.
- The fractured base and character proportions remain stable across the four generated views.
- At board scale it has substantially more character and material coherence than the procedural Archer.
- The model imports as one visible mesh and behaves correctly under Sunder's real scene lighting and camera.

### Remaining caveats

- The bow is dark and can merge into fog, mountains, or the body from some angles. Production polish should lighten its outer edge or add a restrained bone/aqua accent.
- The large pale crest remains the strongest read at 40 pixels. That is consistent with the Warrior target, but future classes must reserve additional silhouette space for their equipment.
- The PBR texture set is larger than necessary for normal gameplay distance. Downsample testing should happen before converting the full roster.
- The model is static and unrigged. Approval here is for visual language and class readability, not final animation readiness.

## Review routes

- Model Lab: `/model-lab?tribe=4`
- Live deterministic board: `/?devgame=6104,11,4,highlands&p2-archer=1`

The live-board route is development-only and converts the starting Nerivane Warrior to an Archer solely for visual review. Normal game rules and normal production rendering are unchanged.

## Recommended next step after approval

Treat the Warrior and Archer together as the locked Nerivane P2 pair. Produce the **Defender** next because its shield gives the strongest test of whether the shared P2 body can support a radically different class silhouette. Do not batch the full roster until Defender also passes the same Model Lab and real-board acceptance checks.
