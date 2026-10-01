# Mycelon Warrior — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; neither approved nor enabled in normal gameplay.** The owner's breadth-first direction remains in effect: complete the other tribes before subjective aesthetic revisions.

## Provenance

- The [Mycelon five-role concept lineup](https://app.scenario.com/assets?openAssetId=asset_9kV6y6riobiekxmPShL3Ha6A) supplied one isolated Warrior reference `asset_EsXnNzihyjhCdZGEQ26JUwrq`. The archived reference and locked four-view prompt are outside Git under `cross-tribe/mycelon/warrior/`; the submitted prompt, without its trailing POSIX newline, matched SHA-256 `a4dae274aac1b70dbe6c64cbe370b4548dd005faf515f5e2c4835784784e86a6`.
- One Sunburst 3840×2160 turnaround job `job_JM3uv2rgzAz8yT4EihWphh7e` produced [asset `asset_JaZeejtRJiReo2uZkGLUTj6n`](https://app.scenario.com/assets?openAssetId=asset_JaZeejtRJiReo2uZkGLUTj6n). One reference/image, Quality/Background Auto, displayed 18 CU. The native PNG master is `mycelon/warrior/mycelon-warrior-turnaround-v1.png` (6,681,660 bytes; SHA-256 `5ee08980046de7d904fcfbefa1203cfe3055b5f327517abddb6c706af2a7b98f`). Front, left, back and right were inspected and normalized separately to 1024² Tripo sources. The generated blade is larger than the written brief; retain that as a first-pass observation.
- Distinct Tripo P2 input IDs: front `asset_M7g7SgdB6gegA8V4HgKqTsT1`, left `asset_cdao81xU3cpLPhkKjT1Fxnov`, back `asset_pop3H64AnxzhKwzKVNzsRqkC`, right `asset_j39HMe3szRvCJNMQtigwwVeL`. Exactly one [P2 Multi View job `job_kaWW7VuVPgkrg7obQmcw9Xyr`](https://app.scenario.com/create?restartGeneration=job_kaWW7VuVPgkrg7obQmcw9Xyr) produced [3D asset `asset_xvpEHJBy5FW2BPCKRjh1QapM`](https://app.scenario.com/assets?openAssetId=asset_xvpEHJBy5FW2BPCKRjh1QapM), seed `1564585106`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit; displayed 220 CU.
- Native GLB master: `cross-tribe/mycelon/warrior/model/mycelon-warrior-tripo-p2-v1.glb` outside Git, SHA-256 `9b4bccab72d57a34bb21e137d0f08af9a9c2cd0524840c411120dbaa9a6196c2`. Runtime URL `/manus-storage/mycelon-warrior-tripo-p2-v1_786024e4.glb`. Never bundle this binary in `client/public` or the Git repository.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 3,523 | Informational |
| Triangles | 4,518 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 2,504,068 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The original JSON audit is archived beside the GLB and agrees with Scenario's viewer geometry.

## Visual review and routes

- [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=7#mycelon-warrior-comparison): `cross-tribe/mycelon/warrior/review/mycelon-warrior-procedural-vs-p2.png` includes real procedural and imported portraits, 40px color/grayscale, eight rotations apiece, and approximate occupied-hex scale.
- [Query-gated Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,7,highlands&p2-candidate=mycelon-warrior): the real opening Mycelon Warrior `u1` at `(10,7)` becomes one `p2CrossTribePreview` node, with no page errors. Screenshot `cross-tribe/mycelon/warrior/review/mycelon-warrior-live-board.png`. No normal-game starter code was changed.
- **Strength:** split-leaf crest, hooked oversized falchion, offset buckler and fissured plinth make a different silhouette from the procedural spear carrier. **Risk:** the original #99ed47 identity is mainly in small crest/waist/rune accents; dark bark and forest green blend together at 40px and beside green terrain, while the exaggerated, upright blade departs from the intended broad diagonal rootwood falchion. Record for the later whole-roster refinement pass; do not silently recolor or approve.

## Validation

- The Model Lab rendered **24 real portraits**. The opted-in Babylon board loaded one authentic Warrior preview and reported zero page errors. The WebDev GLB proxy returned HTTP 307 to a signed storage URL.
- `pnpm check` and **21 focused imported-model tests** passed. A normal unflagged Mycelon devgame loaded the correct human tribe and canonical hero, **zero imported GLB requests**, **zero review-preview nodes** and zero page errors.
- The complete Sunder suite passed **269 tests in 35 files** and the Vite/esbuild production build completed successfully. `git diff --check` passed before GitHub publication.
