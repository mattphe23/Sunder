# Dravok Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not owner-approved and not enabled in ordinary gameplay.** This is a breadth-first Defender study, not a replacement for Sunder’s procedural Dravok Defender. Only explicit review routes request the imported GLB.

## Provenance

- The original 1024×1024 Dravok Defender source is archived outside Git, SHA-256 `f286f3e402eca0c2d0f42977643b5bb53b7708a21f75cdbfe6b942bef0deb825`. A disconnected far-right neighboring shard was removed from a **separate** 1024² reference by transplanting only a small feathered studio-background box from an AI-clean intermediate. The entire x=0–805 region, including the character, large shield, mace, crest and base, remains bit-identical to the original. Repaired reference: 869,306 bytes, SHA-256 `8cafb32f231611f0e788c6b1c06f58f786fbcc354c648ca33cb8e2ba206d8e3b`; Scenario reference `asset_upaBp2cUeckqhoe1e29FcGNJ`.
- An earlier alternate design-brief prompt was preserved separately, because its three-block shield rune and squat crest conflict with the actual source’s **two stacked pale diamonds, broad ochre strip and upright wedge crest**. The source-faithful one-canvas prompt is 2,488 characters / 2,494 UTF-8 bytes, SHA-256 `fffc054235b969c0d0f937b6809ac32415f57056bb619efb88db5a4400a6398c`.
- Exactly one 18-CU [Sunburst job `job_8o3Mbz2BwVVLPTWJCF9vzbTL`](https://app.scenario.com/create?restartGeneration=job_8o3Mbz2BwVVLPTWJCF9vzbTL) generated [image `asset_7M4qdr79dfFYPNe7bU2GxHbE`](https://app.scenario.com/assets?openAssetId=asset_7M4qdr79dfFYPNe7bU2GxHbE): one reference, one output, physical 3840×2160, Quality/Background Auto. The native PNG is 8,194,181 bytes, SHA-256 `907891634764b9ab1abad86658d45384f8d3db5cbf3e402cb85ccfeab2799311`. Four independent 1024², unstretched front/left/back/right crops were inspected and archived outside Git. The right profile retains too much shield front face; it is an input limitation, not secretly repaired.
- Four independently uploaded P2 assets: front `asset_znzGudcKTMc9kyRqXkb4kA6T`, left `asset_u4c2SNbHNBii5RBkiN4z5kP3`, back `asset_BFePWhsHmrysRQjGbZ1nzv9q`, right `asset_ryFpF2REsaguT1PojADVYXWe`. Exactly one 220-CU non-Quad [Tripo P2 job `job_nkgwd6ZKfQ8Vexj6BJnEoLGB`](https://app.scenario.com/create?restartGeneration=job_nkgwd6ZKfQ8Vexj6BJnEoLGB) produced [3D asset `asset_TcpQiTL2ENqZanWhsCAeLYvY`](https://app.scenario.com/assets?openAssetId=asset_TcpQiTL2ENqZanWhsCAeLYvY), seed `1118077937`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit and seeds.
- Original GLB master: `cross-tribe/dravok/defender/model/dravok-defender-tripo-p2-v1.glb` outside the repository, 3,246,060 bytes, SHA-256 `65bf8cc54d45d38a4170d9ef8d72faefd878e20aec124efa0e38582b0dcea314`. It was archived from the exact asset viewer’s signed `model/gltf-binary` resource after its native GLB menu export did not persist to the sandbox Downloads directory. Content type, exact asset, byte count, glTF header and read-only model audit were validated. Runtime `/manus-storage/dravok-defender-tripo-p2-v1_f9f69e23.glb` returned HTTP 307 locally and publicly; no binary model was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 5,177 | Informational |
| Triangles | 3,200 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,246,060 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The model bounds are approximately 0.56×1×0.61; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=5#dravok-defender-comparison): `cross-tribe/dravok/defender/review/dravok-defender-procedural-vs-p2.png` contains **24 real rendered portraits**, including full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. P2 renders a blocky stone guard with ochre wedge crest, narrow tall shield and a small mace. Its shield face appears much narrower than the procedural icon’s broad high-contrast mark; at 40px and in grayscale the emblem/weapon nearly disappear. The chunky stone plinth occupies a large portion of the miniatures’ height.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,5,highlands&p2-candidate=dravok-defender): actual Babylon scene rendered imported preview node `u1`, a Defender at `(10,7)` beside the city and Dravok hero, with zero page errors. Screenshot: `cross-tribe/dravok/defender/review/dravok-defender-live-board.png`. Dravok is displayed in the HUD even though the seeded development scenario reorders the human tribe to runtime index 0. The imported shield’s diamond detail is subtle at board scale and the P2 figure is smaller/duller than the neighboring procedural hero.
- An unflagged Dravok board kept one canonical hero and made **zero GLB requests, zero imported-preview nodes and zero page errors**. This first pass stays review-only; its rounded/chunky base, narrow shield and muted 40px read are candid risks, not owner-approved aesthetic choices. Do not swap normal-gameplay models or make global silhouette changes before the roster breadth is covered.

## Validation

- GLB integrity/mobile audit, local/public storage proxy, `pnpm check`, **33 focused registry tests**, `git diff --check`, 24 actual portraits, real query-gated Babylon board and ordinary-game negative control passed. The full suite passed **281 tests in 35 files** and the production build passed (the existing large Babylon bundle warning remains). Technical integration is not owner aesthetic approval.
