# Sunwei Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** This is the third non-Nerivane Rider in the breadth-first wave. Sunder's procedural Sunwei Rider remains the default. Dravok, Mycelon and Kharzul Riders and other unique/hero roles remain for later passes; unrelated project TODOs are not complete.

## Provenance

- Original source outside Git: `cross-tribe/sunwei/sunwei-rider-source.png`, 1024×1024, SHA-256 `1305d9d5ab92235698895d8fe09c616d272b4f1fc44d9fb9f425e9597926198`, unchanged. For the single reference, a reproducible margin-only cleanup removed disconnected left-column/right-triangle background fragments while retaining central subject pixels x=235–823 bit-identical: `cross-tribe/sunwei/rider/sunwei-rider-source-edge-repaired.png`, 867,745 bytes, SHA-256 `e285777792edcae831854a7f15683b0e1d2c2554fded42bdd0acc04f0f9f9de4`. An older, source-mismatched spear-and-pennant prompt was preserved but not used. The locked source-faithful prompt is 2,866 characters, SHA-256 `2f04b8b204da357b1d593ebd88d9b131f36b789998e9f2bc66a20`; it preserves the gold crest, masked rider, brown donkey/mule-like pack mount, ears, reins, rear rolls and panniers, and does not invent a spear or pennant.
- Exactly one 18-CU [Sunburst job `job_6xCDQt3jSYbqDh1ufevX1ujb`](https://app.scenario.com/create?restartGeneration=job_6xCDQt3jSYbqDh1ufevX1ujb) produced [image `asset_we4L9Uhwye9WwjXLZPuCFBdZ`](https://app.scenario.com/assets?openAssetId=asset_we4L9Uhwye9WwjXLZPuCFBdZ) using the single repaired reference `asset_zcz5MgYgqaurZQKafKBL23bx`, one native 3840×2160 output and Quality/Background Auto. Archived original PNG: 8,625,281 bytes, SHA-256 `251271faca76e68164fd218d6f9196031f42364be26494425536ecd531d0a3ce`.
- Equal-width cropping was **rejected before P2**: the generated sheet's vertical separators are nonuniform and that naive crop clipped the left muzzle and right tail. The source-pixel-preserving corrected cropper `cross-tribe/sunwei/rider/normalize-sunwei-turnaround.py` used measured separators to create four independently inspected unstretched 1024² views; the side views are mildly oblique rather than perfect orthographic profiles. Front `asset_diYBu65yQYDG23cmHGFvQxAz`, Left `asset_7FEbbLmZtU37D1r3VJAwD2Z1`, Back `asset_HLBn5JnAcNjTSzGWeh3k6TcE`, Right `asset_wLGdjfXBd7EEd7iE7VkKTYa5` are four distinct durable Scenario assets from the corrected views.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_CSnpz9wSmCCJ8wkiVXKCwHKi`](https://app.scenario.com/create?restartGeneration=job_CSnpz9wSmCCJ8wkiVXKCwHKi) produced [3D asset `asset_LspM7h5PKh5maxNp8kUH7y8R`](https://app.scenario.com/assets?openAssetId=asset_LspM7h5PKh5maxNp8kUH7y8R), seed `2007794122`. Texture/PBR/Delight on, Auto Size/Quad off; Standard quality, Original Image alignment, default version/orientation and blank face limit/seeds. No retry or second job was submitted.
- Original GLB master: `cross-tribe/sunwei/rider/model/sunwei-rider-tripo-p2-v1.glb` outside Git, 3,600,564 bytes, SHA-256 `08187d94fc3a09878c1cd6e335db010dc59e4c19638f03f95a89a7b5c2e16328`. Archived from the exact asset viewer's signed `model/gltf-binary` resource with verified byte length and glTF header. `/manus-storage/sunwei-rider-tripo-p2-v1_ccc4c855.glb` returned HTTP 307 locally and publicly; no binary media is in Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 8,017 | Informational |
| Triangles | 5,294 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,600,564 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Bounds approximately 0.790×1×0.517; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=2#sunwei-rider-comparison): `cross-tribe/sunwei/rider/review/sunwei-rider-procedural-vs-p2.png` contains **24 actual Babylon-rendered portraits**: full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. The P2 source-faithfully shows the gold crest, masked rider and brown pack-mount form with rear provisions rather than inventing the procedural model's bright banner. At full size it is more anatomically detailed, but its browns/gold are **muted beside the procedural Rider's brighter cream/gold**; at 40px/grayscale, team color and pack details weaken sharply. The smaller narrow silhouette and gray-brown, rounded faceted base reduce occupied-hex contrast; the base is not a clear universal fractured hex. These are candid first-pass review risks, not owner aesthetic approval.
- [Opt-in development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,2,highlands&p2-candidate=sunwei-rider): actual Babylon scene with imported Rider preview node `u5` at `(2,1)` near the Sunwei capital and its canonical procedural hero; captured state and top bar identify Sunwei (tribe index 2). Screenshot: `cross-tribe/sunwei/rider/review/sunwei-rider-live-board.png`. The upright crest and mounted outline read at board zoom, but the earthy body blends with green terrain compared with the bright procedural hero. No page errors. Scenario's WebGL screenshot transport was unreliable; the quality judgment uses actual Babylon evidence.
- An **unflagged** Sunwei game at the same seed retained one canonical hero, **zero imported GLB requests, zero imported preview nodes and zero page errors**. Imported media remains query-gated and opt-in.

## Validation

- GLB integrity/mobile audit, local/public HTTP 307 redirects, `pnpm check`, **38 focused imported-model registry tests**, 24 genuine Babylon Model Lab portraits, Sunwei board identity, unflagged negative control and `git diff --check` passed. The **full suite passed: 286 tests in 35 files**. The bounded-memory production client/server build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully, with only large-chunk warnings. Technical integration never implies owner aesthetic approval.
