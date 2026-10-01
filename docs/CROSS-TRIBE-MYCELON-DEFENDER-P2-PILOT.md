# Mycelon Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not owner-approved and not enabled in ordinary gameplay.** This is a breadth-first Defender study, not a replacement for Sunder’s procedural Mycelon Defender. Only explicit review routes request the imported GLB.

## Provenance

- The original 1024×1024 source is preserved outside Git. A disconnected black top-edge fragment at x=739–765, y=7–42 was removed only in a separate technical source reference; **every original pixel from y=48 through the bottom remains bit-identical**. The 556,249-byte repaired source has SHA-256 `ac9b040916d99eb9e666552624a56e6ca274da848666d73ab27135a4d94b876e` and became Scenario reference `asset_qjwK2aUDLrWSezo5MjAoBcPR`. The older mismatched design-brief prompt was archived separately, not submitted.
- The source-faithful turnaround prompt is 2,793 characters, SHA-256 `c4de5530a5639ce9f608f95d5de29662b4853b1992151a214753b913f62be0c0`. Exactly one 18-CU [Sunburst job `job_EwGmgoU5PgtT7EPauMjbBpPC`](https://app.scenario.com/create?restartGeneration=job_EwGmgoU5PgtT7EPauMjbBpPC) produced [four-view image `asset_GWUZvbuExdKdKJqdXEaMqK4J`](https://app.scenario.com/assets?openAssetId=asset_GWUZvbuExdKdKJqdXEaMqK4J): one correct Reference Images input, one 3840×2160 output, Quality/Background Auto. An initial file was accidentally attached to **Prompt assistance** on an unsent form; that form was reset before the correct reference upload, with **no extra image job**. The 7,399,452-byte native PNG is SHA-256 `e7c7906797e713195e3ae79323cff512bd9540c77b5db015552f3e5a37cea384`.
- Four distinct unstretched 1024² inputs were archived and inspected: Front `asset_hyMqXbDg7zLjKU8GHf3XmkZ3`, Left `asset_rXpz7RaKceouzpyB2xq8597d`, Back `asset_j1FfeBqvuPARqDxR99Gzd6W1`, Right `asset_5D1whq7Nesm1Wq3akQo5UikA`. **The right crop is a three-quarter right view, not a strict orthographic 90° profile**; shield front is visible. This is a candid input limitation, not a secretly corrected view.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_gPSq39v24ci3GGtXTjnkcpRe`](https://app.scenario.com/create?restartGeneration=job_gPSq39v24ci3GGtXTjnkcpRe) produced [3D asset `asset_rDVB52yVEAHL2D473tqdi56L`](https://app.scenario.com/assets?openAssetId=asset_rDVB52yVEAHL2D473tqdi56L), with Texture/PBR/Delight **on**, Auto Size/Quad **off**, Standard quality, Original Image alignment, default orientation/version and blank face limit/seed.
- Original GLB master: `cross-tribe/mycelon/defender/model/mycelon-defender-tripo-p2-v1.glb` outside the repository, 3,056,332 bytes, SHA-256 `80b156e4c769f81a6fcbea7d054da70f2e48c2753ad087ff13c58db5df80b0ec`. It was archived from the **exact asset viewer’s signed `model/gltf-binary` original resource**, with content type, byte length, glTF header and read-only audit verified. Runtime `/manus-storage/mycelon-defender-tripo-p2-v1_225e0a80.glb` returned HTTP 307 locally and publicly; no binary media was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,443 | Informational |
| Triangles | 4,968 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,056,332 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Model bounds approximately 0.58×1×0.69; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=7#mycelon-defender-comparison): `cross-tribe/mycelon/defender/review/mycelon-defender-procedural-vs-p2.png` contains **24 real rendered portraits**, including full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. The P2 character has a tall lime mushroom cone, pale faceted mask, muted leaf-pattern shield and staff. The tall crest could read as a hero; at 40px, especially grayscale, the leaf sigil and staff are much subtler than the procedural high-contrast shield arrow. The chunky stone base occupies significant silhouette height.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,7,highlands&p2-candidate=mycelon-defender): real Babylon scene rendered imported preview node `u1`, Defender at `(10,7)` beside the city and procedural Mycelon hero, with no page errors. Screenshot: `cross-tribe/mycelon/defender/review/mycelon-defender-live-board.png`. The HUD shows Mycelon even though the development scenario reorders the human tribe to runtime index 0. The imported Defender is smaller and darker than its procedural hero neighbor; its low-contrast shield could be confused with other staff-bearing units at game-board scale.
- An unflagged Mycelon board kept one canonical hero with **zero imported GLB requests, zero preview nodes and zero page errors**. These risks are for owner review after breadth-first role coverage, not a mandate to revise the whole visual system now.

## Validation

- GLB integrity/mobile audit, local/public storage proxy, `pnpm check`, **34 focused registry tests**, `git diff --check`, 24 actual portraits, real query-gated Babylon board and ordinary-game negative control passed. The full suite passed **282 tests in 35 files** and the production build passed (the existing large Babylon chunk warning remains). Technical integration is not owner aesthetic approval.
