# Dravok Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** This is the fourth non-Nerivane Rider in the breadth-first wave. Sunder's procedural Dravok Rider remains the default; Mycelon and Kharzul Riders and other pending roles remain for later passes. This pilot does not complete unrelated project TODOs.

## Provenance

- Unchanged original source outside Git: `cross-tribe/dravok/dravok-rider-source.png`, 1024×1024, 913,566 bytes, SHA-256 `0a2772cd1542bc34cea16eb38169849c1139b5c83389faacf2abfc78e1f33766`. It depicts a stocky gray granite ram with layered curled horns, block feet, an ivory-masked ochre/slate rider, a tall double-ended quarry pick, ochre diamond flank cloth and a fractured gray stone hex with one gold crack. The top source edge clips small pick/mask facets. A mismatched older brief was preserved but **not submitted**. The locked source-faithful prompt, SHA-256 `94bb8462ef3b7688f87fb40e5d2cc3ef06f6ef5bdf9ddc97d1dce13d0b8acb8d`, requested only minimal completion of the clipped facets, not redesigned horns, weapon or pennant.
- Exactly one 18-CU [Sunburst job `job_AwPqksYGkPPwYY5QsbwhiiGa`](https://app.scenario.com/create?restartGeneration=job_AwPqksYGkPPwYY5QsbwhiiGa) used source `asset_C32x22pYxoz7RTvw7uiBoqPS` and produced [image `asset_iFSmNF5qX22EtHjWTr1L93Hs`](https://app.scenario.com/assets?openAssetId=asset_iFSmNF5qX22EtHjWTr1L93Hs): one native 3840×2160 output at Auto quality/background. The original PNG is archived outside Git, 8,868,646 bytes, SHA-256 `08de5f95c230de8cc053c5e3ea53e8aac33988cfa23847712b5990cd9c7ff70d`. Four separately QA'd unstretched 1024² Front/Left/Back/Right crops retain horns, pick, hooves and base. The back is a true rear; both side views are mildly three-quarter rather than fully orthographic.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_BjB7zg8XSJGRfD53PnvuH1t6`](https://app.scenario.com/create?restartGeneration=job_BjB7zg8XSJGRfD53PnvuH1t6) produced [3D asset `asset_1v41P7Exr45acZHqYTrLnUzN`](https://app.scenario.com/assets?openAssetId=asset_1v41P7Exr45acZHqYTrLnUzN), seed `16021265`. Independent durable P2 inputs: Front `asset_HXdx5j5EQoN5kYLbGKptx6Fj`, Left `asset_63bdSnJ7Kmc7SzuayQpdBCRm`, Back `asset_F4H1qzV1tT4VPrRmytRbkPQ5`, Right `asset_pUGKwDt8smFn8zftRspvbAZc`. Texture/PBR/Delight on; Auto Size/Quad off; Standard quality, Original Image alignment, default version/orientation, blank face limit and seed. No second job or 230-CU Quad submission.
- Immutable original GLB master: `cross-tribe/dravok/rider/model/dravok-rider-tripo-p2-v1.glb` outside Git, 2,807,708 bytes, SHA-256 `f6d975b2d9be7221cb7420ab1b537e7e8f10ffaabec20f17f49263f6328d8ed4`. Downloaded from the exact asset viewer's signed `model/gltf-binary` resource with verified byte count and glTF header. Its managed path `/manus-storage/dravok-rider-tripo-p2-v1_296fcc0d.glb` returns HTTP 307 in both local and public previews. No binary media is committed or placed in `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 2,766 | Informational |
| Triangles | 3,558 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 2,807,708 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Bounds approximately 0.768×1×0.579; no GLB mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=5#dravok-rider-comparison): `cross-tribe/dravok/rider/review/dravok-rider-procedural-vs-p2.png` contains **24 actual Babylon-rendered portraits**: full-size procedural/P2, 40px color and grayscale, eight rotations each and occupied hexes. The P2 retains the conspicuous curled ram horns, masked rider, quarry pick, ochre chest/cloth and low fractured base at full size. It reads more like a sculpted stone ram than the existing brown blocky mount, but its weapon is less legible and its lighter ochre/gray is much more muted than the procedural Rider's bright pennant. At 40px/grayscale, the horned mount stays distinct but team-color and rider/weapon identity weaken. The base reads as a rounded gray stone slab rather than a crisply fractured universal hex. These are candid first-pass risks, not owner aesthetic approval.
- [Opt-in development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,5,highlands&p2-candidate=dravok-rider): genuine Babylon scene with an imported Dravok Rider preview node `u1` on unit `(10,7)`, and the canonical procedural hero. Captured state and top bar both identify **Dravok** (tribe index 5). Screenshot: `cross-tribe/dravok/rider/review/dravok-rider-live-board.png`. The mount/horn silhouette reads against green terrain, but gray-on-gray contrast deteriorates next to the neighboring highland stone, and the procedural hero is much brighter. No page errors. Scenario's WebGL screenshot transport is unreliable; the quality judgment uses the actual Babylon evidence.
- An **unflagged** Dravok game at the same seed retained one canonical hero, **zero imported GLB requests, zero imported preview nodes and zero page errors**. Imported media remains opt-in/query-gated.

## Validation

- Original-source/four-view QA, GLB integrity/mobile audit, local/public HTTP 307 redirects, `pnpm check`, **39 focused imported-model registry tests**, 24 genuine Babylon Model Lab portraits, Dravok board identity, the unflagged negative control and `git diff --check` passed. The **full suite passed: 287 tests in 35 files**. The bounded-memory production client/server build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully, with only large-chunk warnings. Technical integration never implies owner aesthetic approval.
