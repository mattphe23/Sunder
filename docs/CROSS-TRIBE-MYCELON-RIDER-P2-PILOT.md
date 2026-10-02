# Mycelon Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** This is the fifth non-Nerivane Rider first pass in the breadth-first wave. Procedural Mycelon remains the default. A minor color/readability discrepancy can be deferred rather than interrupting the owner's priority of a working TestFlight; Kharzul Rider remains pending. This report does not mark unrelated roster roles or iOS release work complete.

## Provenance

- Original Mycelon Rider source outside Git: `cross-tribe/mycelon/mycelon-rider-source.png`, 1024×1024, 759,368 bytes, SHA-256 `25bf3b627b33d1dbea3054934b0b60aa67f149637f3073c0d5c8e7fc3fdf3c73`, unchanged. It shows a lime-crested rider on a broad emerald/charcoal beetle with paired forward mandibles, segmented legs, long upright two-prong rootwood staff, a streaming lime banner and a fractured gray hex with green fissure. A source-mismatched old prompt was preserved but **not submitted**. The source-faithful locked prompt SHA-256 is `540718e42d943c816476333fdd625241fb37b2b896212ba65d4103fd460b102e`.
- Exactly one 18-CU [Sunburst job `job_coteRharMnSFQsPGFnhxxRwp`](https://app.scenario.com/create?restartGeneration=job_coteRharMnSFQsPGFnhxxRwp) used only durable source `asset_WBRbZKYuS9Lt6nDLbVNe2Zbd` and produced [image `asset_enhpTLnAzAYJRgUdvV3zeXHm`](https://app.scenario.com/assets?openAssetId=asset_enhpTLnAzAYJRgUdvV3zeXHm): one native 3840×2160 output with Auto quality/background. The archived original PNG is 7,847,066 bytes, SHA-256 `fb2bb033b9536c0943af027b135ab49bc33a7d4f9a1a537320f02adf30ea403b`. Four distinct unstretched 1024² Front/Left/Back/Right crops were independently QA'd for the staff, banner, mandibles, multiple legs, crest and complete base.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_LrR2VoLKCfygsJGFbjt7Lv4e`](https://app.scenario.com/create?restartGeneration=job_LrR2VoLKCfygsJGFbjt7Lv4e) produced [3D asset `asset_tk6JQ9todKh6wYoQc6BfkYW7`](https://app.scenario.com/assets?openAssetId=asset_tk6JQ9todKh6wYoQc6BfkYW7), seed `286870324`. Four independent durable inputs: Front `asset_H1XbUh1Y6r5ZmpRhyqF8jSJi`, Left `asset_p6jdyiTM9UALRceKj8KU381n`, Back `asset_TDcJYw3FjEzPYWZRsiSafDnW`, Right `asset_PikCHaW79TzSFDyzc7AFPobt`. Texture/PBR/Delight on; Auto Size/Quad off; Standard quality, Original Image alignment, default version/orientation and blank face limit/seeds. There was no second job or 230-CU Quad run.
- The immutable GLB outside Git is `cross-tribe/mycelon/rider/model/mycelon-rider-tripo-p2-v1.glb`, 3,294,512 bytes, SHA-256 `b74a4922fb3a4a0fdf13a345327f0d93f9b48df1a7f2b4dcad8ea336ef89556e`. It was downloaded from the exact output viewer's signed original `model/gltf-binary` URL with the expected asset ID, byte length and glTF header. Managed runtime path `/manus-storage/mycelon-rider-tripo-p2-v1_2190494a.glb` returns HTTP 307 locally and publicly. Binary media is neither committed nor put in `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,948 | Informational |
| Triangles | 4,853 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,294,512 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates pass; bounds approximately 0.730×1×0.600. No mesh/texture retouching was done.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=7#mycelon-rider-comparison): `cross-tribe/mycelon/rider/review/mycelon-rider-procedural-vs-p2.png` contains **24 real Babylon-rendered portraits**—full-size procedural/P2, 40px color/grayscale, eight rotations and occupied hexes. The new model retains beetle/mandibles, rider, forked staff, bright fissure and banner geometry; it is more anatomically distinct than the blocky procedural mount. However its lime/green colors and pennant are notably less vivid, the forked staff looks like a thin silhouette, and at 40px/grayscale the riding figure and banner blend into the mount/base. The base is more rounded and raised than the clean procedural fractured hex. These are recorded first-pass risks, not a reason to stop breadth-first progress for color polish.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,7,highlands&p2-candidate=mycelon-rider): actual Mycelon game (tribe index 7) with a Rider preview node `u1` at `(10,7)`, plus the normal procedural hero, captured in `cross-tribe/mycelon/rider/review/mycelon-rider-live-board.png`. The beetle silhouette reads against green ground, but is darker and less lime-saturated than the hero and tile rims; no page errors. The unit object's internal `tribe` field is a game roster slot, while `humanTribeName` and the top bar correctly identify Mycelon.
- An **unflagged** Mycelon game at the same seed retained one canonical hero and loaded **zero candidate GLB requests, zero preview nodes and zero page errors**. Imported 3D media is opt-in/query-gated.

## Validation

- Source/four-view QA, original GLB audit, managed-storage HTTP 307 checks, `pnpm check`, **40 focused imported-model registry tests**, 24 Babylon portraits, board identity, unflagged negative control and `git diff --check` passed. The **full suite passed: 288 tests in 35 files**. The bounded-memory production client/server build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully with only large-chunk warnings. Technical integration does not imply owner aesthetic approval or default replacement.
