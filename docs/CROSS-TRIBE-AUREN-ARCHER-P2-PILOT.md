# Auren Archer — Scenario P2 first-pass study

**Decision: review candidate only.** The owner chose to complete all remaining tribes' first-pass units before tweaking the art. This GLB is opt-in through a development review route; normal Auren matches remain procedural.

## Source and reproducibility

- Six-role Auren concept: [`asset_RCsqLmFC8unqSYLQQpaD2zuN`](https://app.scenario.com/assets?openAssetId=asset_RCsqLmFC8unqSYLQQpaD2zuN), GPT Image 2.5 Sunburst. Archer isolated from the full 3840×2160 sheet.
- Controlled four-view Archer turnaround: [`asset_92NdroPwsJW3hkyhsvuB6sn6`](https://app.scenario.com/assets?openAssetId=asset_92NdroPwsJW3hkyhsvuB6sn6), original 3840×2160 PNG, front/left/back/right each normalized to 1024×1024 and visually checked for bow, quiver, palette and hex base.
- Tripo P2 Multi View input asset IDs: front `asset_M97zNQ19uNRwtLB7V8oe7xgv`, left `asset_cUKF1x9NPat5SmG4bHqGhSuw`, back `asset_wAPkQKutw8iCrM9dqW9yQ8Q4`, right `asset_AxHa3i8canc1bL69ixopYVvS`. Texture, Delight and PBR on; quality Standard, alignment Original Image, orientation default, Auto Size and Quad off, Face Limit blank.
- Output: [`asset_eNPksMqxoZUYdAcncHHYBxjG`](https://app.scenario.com/assets?openAssetId=asset_eNPksMqxoZUYdAcncHHYBxjG), seed `248197393`. Preserved GLB `/manus-storage/auren-archer-tripo-p2-v1_d0a2631a.glb`; SHA-256 `62c8d3f9c9436646c788f06127d0f79ffe3f0234c3be24dcd8e3547a668eebcf`. Master files and production record reside outside Git at `/home/ubuntu/sunder-art-pipeline/cross-tribe/auren/archer/`.

## Model budget

| Measure | Audited result | Review limit |
|---|---:|---:|
| Vertices | 7,697 | Informational |
| Triangles | 4,812 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| GLB bytes | 3,191,580 | ≤5,242,880 |
| Materials / embedded images | 1 / 3 | Informational |
| Largest texture | 2048×2048 | ≤2048×2048 |

## Acceptance routes

- Model Lab: `/model-lab?tribe=0#auren-archer-comparison`, with full-size procedural and P2 portraits, 40px color/grayscale, eight rotations, and occupied-hex context.
- Real board: `/?devgame=6104,11,0,highlands&p2-candidate=auren-archer`. This is **development-only**; it converts the local starter to Archer and places it on a vacant adjacent grass hex if possible. It does not alter rules, ordinary starting units, saved games or production defaults.
- Judge bow silhouette at 40px, navy/ivory faction identity, weapon and base visibility, eight-view continuity, and contrast alongside the entire Auren roster. Keep the approval decision open until that collective review.

## Browser review evidence

- The Model Lab screenshot rendered **24 authentic portraits** (procedural/P2 full size, 40px color/grayscale, eight rotations each, occupied-hex samples). The imported figure and bow appear darker, less blue and somewhat smaller at 40px than the bright procedural reference. This is a **future lineup-level tuning note**, not a reason to silently revise this first-pass candidate.
- The real Babylon board loaded the GLB with `p2CrossTribePreview` metadata on the review-only Archer `u1` at `(10,7)` beside the Auren capital; seed `6104`, no browser page errors. The white mask and bow remain recognizable at the captured close board angle, though the very dark navy armor competes with shadows at game scale.
- TypeScript and the focused imported-model registry tests passed; the WebDev storage proxy served the audited Archer GLB via a signed redirect.
- The **full regression suite passed: 261 tests across 35 files**, followed by a successful production build. The Archer portrait/board browser capture reported no page errors. This technical validation is not a visual approval or a production-asset rollout.
