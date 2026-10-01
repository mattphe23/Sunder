# Valkyra Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved or enabled by default.** The owner's breadth-first direction remains in effect: finish all non-Nerivane roles before subjective tuning.

## Provenance

- [Valkyra concept lineup](https://app.scenario.com/assets?openAssetId=asset_RcQzRKQsqrVQDtkRJV5PJoMz) supplied one isolated Archer reference, Scenario `asset_oE7QepdPhoEVoYgQFQ9Dcb5m`. The locked prompt and 1024² source are archived outside Git in `cross-tribe/valkyra/archer/` and `cross-tribe/valkyra/`, respectively. The live prompt matched SHA-256 `471a9d6714d5ebf426f1a61d43a93c6957af74f6aafd8c3d4c32fdc5ccfc0c7b` without the POSIX trailing newline.
- One 3840×2160 Sunburst job [`job_AVYsWP5z6wPdMkFP4Y8DgMYM`](https://app.scenario.com/create?restartGeneration=job_AVYsWP5z6wPdMkFP4Y8DgMYM) produced [asset `asset_fPJNuaQaswDKWsrXAdTJXZK5`](https://app.scenario.com/assets?openAssetId=asset_fPJNuaQaswDKWsrXAdTJXZK5). Exactly one real source and one image, Quality/Background Auto, 18 CU. The native 7,736,093-byte PNG has SHA-256 `a663f734b3db975972f5a73eeb8f5b74209ca8f2d0d367e719e7acd629a41ba7`; all four actual front/left/back/right views were inspected and normalized to separate 1024² inputs.
- P2 input assets in order: front `asset_notuFEFHQ1RCiAtuoa8FePoz`, left `asset_P7rs8mcbjLHmXLEcPKnnzxSQ`, back `asset_DPJGerwxzyNwMcPTTgMJE3gW`, right `asset_UGkG1HFEZtLESTS8EinsQB1Y`. Exactly one 220-CU [Tripo P2 job `job_KCics4sBrzF8VJEJgfDDYWrH`](https://app.scenario.com/create?restartGeneration=job_KCics4sBrzF8VJEJgfDDYWrH) produced [3D asset `asset_w7FQvv7yUNsXbzRtg1rAzWV4`](https://app.scenario.com/assets?openAssetId=asset_w7FQvv7yUNsXbzRtg1rAzWV4), seed `1442310476`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, face limit blank.
- Native GLB master `cross-tribe/valkyra/archer/model/valkyra-archer-tripo-p2-v1.glb` stays outside Git, SHA-256 `3a297e38aca94c27b0aeb24b5c992498d18060752fd430669f9fc2d455ddb4d2`. Runtime storage URL `/manus-storage/valkyra-archer-tripo-p2-v1_616c7c8e.glb` returned HTTP 307. Never place this model in `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,212 | Informational |
| Triangles | 4,639 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,068,676 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass; the original audit JSON is archived beside the native GLB. Scenario's viewer displayed 6,205 vertices while the GLB's accessor audit counted 6,212; both agreed on 4,639 triangles. The source registry uses the GLB audit.

## Visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=6#valkyra-archer-comparison): the actual `cross-tribe/valkyra/archer/review/valkyra-archer-procedural-vs-p2.png` contains **24 rendered portraits**, full-size procedural/P2, 40px color/grayscale, eight rotations each and approximate occupied-hex scale.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,6,highlands&p2-candidate=valkyra-archer): the real Babylon scene rendered one preview node for the authentic opening Archer `u1` at `(10,7)` on grass with no page errors. Actual capture: `cross-tribe/valkyra/archer/review/valkyra-archer-live-board.png`. No default-game unit placement or ordinary gameplay logic was changed.
- **Strength:** the imported figure remains recognizably bow-and-quiver equipment from side/back rotations, with a clean standalone silhouette on its grass hex. **First-pass risks:** at 40px and on the real board the model is much smaller and darker than the vivid cyan procedural Archer; blue identity is faint, grayscale loses nearly all equipment distinction, and from the front its narrow upright bow can read as a spear. The ordinary hood/crest is tall; the pedestal is rounder than the desired fractured hex. Defer aesthetic changes until all non-Nerivane roles have a first pass.

## Validation

- `pnpm check` and **24 focused imported-model registry tests** passed. The Model Lab rendered all 24 portraits and the real query-gated board loaded authentic Archer `u1` as the preview with zero page errors; storage proxy returned HTTP 307.
- The ordinary unflagged Valkyra board retained its canonical hero and procedural units, with **zero imported GLB requests**, **zero preview nodes**, and zero page errors.
- Full suite: **272 tests in 35 files** passed. The Vite/server production build and `git diff --check` completed successfully. No visual approval or gameplay-default substitution is implied.
