# Kharzul Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not owner-approved and not enabled in ordinary gameplay.** This is the last Defender first pass in the current breadth-first wave, not a replacement for Sunder’s procedural Kharzul Defender. Only explicit review routes request this imported GLB. The other non-Nerivane Rider/unique-unit/hero roles and unrelated project TODOs remain unfinished.

## Provenance

- Original 1024×1024 Kharzul Defender source: 892,011 bytes, SHA-256 `dd41bdf1582b0941a4150c355e19b325e5bc808d8b5814926aeacf87270b5dea`. Two disconnected neighbor fragments at the margins were removed in a separate technical reference using reproducible background-only repairs, while **every original central pixel from x=190 through x=831 remained bit-identical**. The 882,234-byte final reference is SHA-256 `b04eb5976d0fc12dd9c24ef5957a028378f2d3338eb3bef721859d5a20fe42f2`, Scenario `asset_bgD1nv9ByTuo5rN7nkXHC3Tn`. Original source, intermediate and repair scripts are preserved outside Git; the earlier design-brief prompt with source-mismatched crest details was archived, not submitted.
- The source-faithful turnaround prompt is 2,646 characters, SHA-256 `073c967385006cf8990086e499fd554046824529a6834236ced7fb6aaf87929f`. Exactly one 18-CU [Sunburst job `job_JuDuYbkWmL1X4LjxXaxpqGeT`](https://app.scenario.com/create?restartGeneration=job_JuDuYbkWmL1X4LjxXaxpqGeT) produced [four-view image `asset_w2vYLxiVXwowWUHy6TokZCXk`](https://app.scenario.com/assets?openAssetId=asset_w2vYLxiVXwowWUHy6TokZCXk): one Reference Images source, one native 3840×2160 output, Quality/Background Auto. The native PNG has 8,118,546 bytes and SHA-256 `f7fd17e523de693629d6ffd2b785734d5e2e03215a3eed07605b94a061a81886`.
- Four distinct unstretched 1024² P2 images were inspected and uploaded: Front `asset_JfGbGmrvCaeBkAVQj8rmwJVw`, Left `asset_vMAiPN26GnKU3Y6aoYrw6ymS`, Back `asset_RS3rJDjdFRkcM7YWaWYYgvyb`, Right `asset_ya5jo2MLWRbv6oB8Chy8Lh4m`. The original normalized crops and native sheet remain archived. **Left and right are near-profile rather than exact 90° orthographic views**. Their final P2 inputs have only disconnected adjacent-column slivers replaced with studio background at far-left margins; all subject pixels x≥306 and base pixels y≥730 are bit-identical to the originals.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_ASHM4sfAEF27ojJoya7r57co`](https://app.scenario.com/create?restartGeneration=job_ASHM4sfAEF27ojJoya7r57co) produced [3D asset `asset_R2vBuw2Z4atCcgmt6aBsVKPw`](https://app.scenario.com/assets?openAssetId=asset_R2vBuw2Z4atCcgmt6aBsVKPw), seed `436307468`: Texture/PBR/Delight **on**, Auto Size/Quad **off**, Standard quality, Original Image alignment, default orientation/version and blank face limit/seeds.
- Original GLB master: `cross-tribe/kharzul/defender/model/kharzul-defender-tripo-p2-v1.glb` outside the repository, 2,881,528 bytes, SHA-256 `d0f125f0ef7ccd352607b298e129d311a3f8031015b6b0a098509b2f096b69ad`. Archived from the **exact asset viewer’s signed `model/gltf-binary` original resource**, with content type, byte length, glTF header and read-only audit verified. Runtime `/manus-storage/kharzul-defender-tripo-p2-v1_15e05ad1.glb` returned HTTP 307 locally and publicly. No binary media was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 3,746 | Informational |
| Triangles | 4,842 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 2,881,528 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Model bounds approximately 0.57×1×0.63; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=1#kharzul-defender-comparison): `cross-tribe/kharzul/defender/review/kharzul-defender-procedural-vs-p2.png` contains **24 real rendered portraits**, including full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. The imported model retains a red crest, dark armor, mace, broad dark shield and glowing base fissure. Its front-facing shield mostly reads as a dark side slab and the symbol does not match the procedural Defender’s bright orange emblem. At 40px, especially grayscale, the mace and shield detail nearly disappear; the tall red crest could imply a special unit rather than an ordinary Defender. The stone base is rounder and visually heavier than the target fractured hex.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6105,11,1,highlands&p2-candidate=kharzul-defender): actual Babylon scene rendered imported preview node `u3`, Defender at `(2,9)` on grass near the Kharzul capital and procedural hero, with no page errors. Screenshot: `cross-tribe/kharzul/defender/review/kharzul-defender-live-board.png`. At this board angle the red crest and orange base fissure survive, but dark shield and mace read much less clearly than the bright procedural class emblem. Scenario’s WebGL asset-viewer screenshot was unavailable; the visual conclusion uses the real Babylon Model Lab and board instead, not a claim of a Scenario canvas capture.
- An unflagged Kharzul board at seed 6105 retained one canonical hero, **zero imported GLB requests, zero imported preview nodes and zero page errors**. These are candid first-pass risks for eventual owner review after wider role coverage, not grounds for premature global art revisions.

## Validation

- Original GLB integrity/mobile audit, local/public storage redirects, `pnpm check`, **35 focused imported-registry tests**, **283 tests across 35 files** (`CI=true pnpm test`), `git diff --check`, 24 actual portraits, real query-gated Babylon board and ordinary-game negative control passed. The bounded-memory production build completed successfully (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`); Vite emitted its existing large-chunk advisory, not a build error. Technical integration is not owner aesthetic approval.
