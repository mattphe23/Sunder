# Mycelon Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** The owner requested breadth-first coverage before subjective visual tweaks. This asset is available only on explicitly query-gated development review routes.

## Provenance

- The isolated 1024² Mycelon Archer concept crop had two disconnected neighboring-figure fragments at its margins. The reproducible external `cross-tribe/repair-archer-edge-fragments.py` transplanted AI-cleaned studio background into only those isolated margins; every central Archer/bow/quiver/base pixel remains from the original. Submitted source `mycelon-archer-source-edge-repaired.png`: SHA-256 `e99f02b6cfd8be14cdcf4043f5ec46008193987ec30a639d0de5b3e6ddc1d4b8`, 699,941 bytes, Scenario `asset_AuLFu1hGx8RGBTixh442pVxS`. Original, intermediate and repair script are outside Git.
- The locked Sunburst prompt matched live Scenario text without the final newline: SHA-256 `b1ca777f8a5659b71caca3c2ba7eaaab3bea24b62f75d2715e2d03ca6ff13100`. One [Sunburst job `job_RUsPvCRK9eAeoUdqeZitVkVj`](https://app.scenario.com/create?restartGeneration=job_RUsPvCRK9eAeoUdqeZitVkVj) produced [turnaround `asset_oT1osxxvscoctPeSyJoetwnd`](https://app.scenario.com/assets?openAssetId=asset_oT1osxxvscoctPeSyJoetwnd): one source, one 3840×2160 image, Quality/Background Auto, displayed 18 CU. Native PNG: 7,611,305 bytes, SHA-256 `7df37f604b43d91af895e56bbae24f09d6ebc0c031af1ebdf95ae86c975c8134`. Front, left, back and opposite-right profiles were inspected and normalized without stretching to four 1024² views. **Source QA caveat:** Sunburst exaggerated the pointed leaf crest relative to the source's short bifurcated silhouette; retain as a later whole-roster review risk, not an early aesthetic revision.
- P2 asset order: front `asset_WCJhfHMSxU7vRHi4id6bFTg4`, left `asset_mmeK1cJApTHG2oKpir4rR2Ms`, back `asset_tLC4vNFqDTfzzTWJiPrg14oF`, right `asset_zicaRDK47U5XiMtP6u45cufe`. One 220-CU non-Quad [Tripo P2 job `job_qsZkQpGkayFJCiUzTiRRdpBb`](https://app.scenario.com/create?restartGeneration=job_qsZkQpGkayFJCiUzTiRRdpBb) produced [3D asset `asset_QXDWHvq8529Q9MEc6u6Marsb`](https://app.scenario.com/assets?openAssetId=asset_QXDWHvq8529Q9MEc6u6Marsb). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit.
- Native GLB `cross-tribe/mycelon/archer/model/mycelon-archer-tripo-p2-v1.glb` is archived outside Git: SHA-256 `954cea15bb2c7b7b282f4e7a0dcc920f5d5a4f54a317a678e349a154ae99d526`. Runtime `/manus-storage/mycelon-archer-tripo-p2-v1_8fa3590e.glb` returns HTTP 307. No model binary is committed to the repository or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,249 | Informational |
| Triangles | 4,336 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,452,104 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Native GLB audit JSON remains alongside the external master.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=7#mycelon-archer-comparison): the actual `cross-tribe/mycelon/archer/review/mycelon-archer-procedural-vs-p2.png` includes **24 rendered portraits**—full procedural/P2, 40px color and grayscale, eight rotations and approximate occupied-hex scale. The imported mushroom-bow silhouette has detailed layered material and a visible quiver; side rotations show its bow much better than the front view.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,7,highlands&p2-candidate=mycelon-archer): the genuine Babylon scene loaded one preview node for opening Archer `u1` at `(10,7)` on grass near the city and canonical Mycelon hero, with no page errors. Actual screenshot: `cross-tribe/mycelon/archer/review/mycelon-archer-live-board.png`. The requested tribe index `7` is injected into game roster slot `0` by the dev bootstrap; the UI confirms **Mycelon**. Catalog slug `mycelon-archer` maps index `7` to `archer`, not Warrior or hero. Ordinary gameplay remains procedural.
- **First-pass risks:** the taller, sharply pointed leaf crest dominates the imported front silhouette and differs from the short bifurcated source. At 40px, the imported figure is noticeably smaller and darker than the procedural Archer; its bow is thin enough to disappear in front/gray views. On the board it is readable as a small equipped unit but competes with the much larger canonical hero. The base is irregular and stone-like, not a clearly standardized fractured hex. Preserve these for the whole-roster refinement discussion; this is not owner aesthetic approval.

## Validation

- `pnpm check` and **28 focused registry tests** passed; Model Lab rendered 24 portraits; the opt-in Babylon board showed one Mycelon Archer `u1` preview and zero page errors; GLB proxy returned HTTP 307.
- Unflagged Mycelon kept one canonical hero, **zero imported GLB requests**, zero preview nodes and zero page errors.
- Full **276-test/35-file** suite, Vite/server production build and `git diff --check` passed. The existing large-chunk advisory remains unrelated to this query-gated candidate. No aesthetic approval or normal gameplay substitution is implied.
