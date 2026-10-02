# Dravok Bulwark — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** The Dravok unique unit maps to actual gameplay `UnitType` `bulwark` in tribe 5, separately from the ordinary `defender`. Only an explicit development review route may request this GLB; ordinary gameplay remains procedural. Other specialists and heroes remain in the breadth-first roster queue, with landscape and TestFlight later.

## Provenance

- The original `cross-tribe/dravok/dravok-bulwark-source.png` remains unchanged outside Git: 1024×1024, 865,646 bytes, SHA-256 `ed378a138e7ae4760f8e3039d432c31289d470d24211454cd39feb67ce3d186a`. It depicts a wide stone guardian with a split dark-stone crest, gold forehead detail, ivory faceted mask, crenellated masonry shield with twin gold bands and a nested diamond, gold tabard diamond, and a fractured gray base with a gold fissure. No weapon or mount was present in the source. Only detached edge blocks were removed in a reproducible reference repair; the central subject region stayed pixel-identical. Repaired v2 SHA-256: `fdb2176992edb2b4029ef46698d3d4624b53b7324dc729890f6c47d6b212060e`. A superseded source-mismatched brief was archived unused; the source-faithful locked prompt SHA-256 is `daea3c82062d8f77121e22486f169f8057f1dd609a95be2fa2a008c2d93c891e`.
- Exactly one 18-CU [Sunburst job `job_MJVnTTq8KxNjU28K4K8cT8XM`](https://app.scenario.com/create?restartGeneration=job_MJVnTTq8KxNjU28K4K8cT8XM) used one durable repaired reference `asset_ThMvMSPUfVEqkAYZ364Dku17`, the locked prompt, a single 3840×2160 native sheet, Auto quality and Auto background. [Sheet `asset_TgJjNJBvjp3tZZqds5enZccy`](https://app.scenario.com/assets?openAssetId=asset_TgJjNJBvjp3tZZqds5enZccy) is archived unchanged outside Git: 7,578,633 bytes, SHA-256 `9fc8b378f6fed9c3a84fa26a346828c0a463ad43511d7c7bf08422a15fbc946e`. A measured-seam, nonuniform cropper at x=1090, 1910 and 2920 produced four independently inspected unstretched 1024² Front/Left/Back/Right inputs with complete head, shield, legs and plinth. Equal 960px columns were not used.
- Exactly one 220-CU non-Quad [Tripo P2 Multiview job `job_gE2wcprhtq2aZByf693bjYML`](https://app.scenario.com/create?restartGeneration=job_gE2wcprhtq2aZByf693bjYML) yielded [3D asset `asset_7VJKCbNncPof23qfcu8LpsyR`](https://app.scenario.com/assets?openAssetId=asset_7VJKCbNncPof23qfcu8LpsyR), seed `2024409071`. Four distinct slot-selected durable inputs were Front `asset_aZQiyi9grLhMSaNLzqXSaNnv`, Left `asset_DsfsXj1sWy6NSKkPY7HrRLVo`, Back `asset_HeRiFyEhAyjrDqbetBhHN2W5`, Right `asset_H85DtD48tDXpd4Qhvc1YKcpC`. Texture/PBR/Delight on, Auto Size/Quad off, Standard, Original Image, default orientation and blank version/face limit/seeds. No duplicate or 230-CU Quad job.
- The GLB was downloaded **from that exact asset viewer's GLB menu**, then the asset-ID-bearing browser download's filename, 3,310,528-byte length, `glTF` v2 header/reported length and SHA-256 were checked before an identical-byte external archive at `cross-tribe/dravok/bulwark/model/dravok-bulwark-tripo-p2-v1.glb`. SHA-256: `4c8899290cf3297d2385c861d1961a97f39def6d810b7caf7415e30c42d16f00`. This was a viewer-originated native download rather than the earlier signed-URL/HEAD archival route; a signed URL was **not** recovered from the browser performance resources, so no HEAD MIME claim is made. Managed runtime path `/manus-storage/dravok-bulwark-tripo-p2-v1_17deec7d.glb` returned HTTP 307 locally and from the public preview. No binary media was added to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,381 | Informational |
| Triangles | 5,275 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,310,528 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. This model has not been retouched. Side/rear geometry is generated from the one repaired three-quarter source, not documented original views.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=5#dravok-bulwark-comparison): real `cross-tribe/dravok/bulwark/review/dravok-bulwark-procedural-vs-p2.png` contains **24 Babylon-rendered portraits**, including full procedural/P2 views, 40px color/grayscale, eight rotations each and an occupied hex. The P2 model retains the broad crenellated two-sided shield, split crest and stocky guardian shape; the rear view is complete. Relative to the much more blocky high-contrast procedural unit, the candidate is **smaller and significantly grayer**, with a raised rounded stone base rather than a sharp fractured hex. The gold shield diamond and tribe cue lose definition at 40px/grayscale, and the tall crest can read like two upright ears. These are deferred readability/style risks, not an owner aesthetic decision.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,5,highlands&p2-candidate=dravok-bulwark): genuine Dravok game at seed `6104`, Bulwark preview node `u1` on grass `(10,7)`, one retained procedural hero and zero page errors. In `cross-tribe/dravok/bulwark/review/dravok-bulwark-live-board.png`, the P2 candidate is visibly in front of a city with no material occlusion; the hero and gray mountain silhouettes make the model's softer stone tones less distinct. No art regeneration or alternate seed was required.
- The same-seed **unflagged** Dravok game retained one canonical hero, **zero imported candidate GLB requests, zero preview nodes and zero page errors**. The Bulwark GLB is query-gated/opt-in only.

## Validation

Source/crop QA, external original-GLB integrity audit, local/public managed-storage redirects, `pnpm check`, **45 focused registry tests**, real 24-portrait/board capture, same-seed zero-import negative control and **293 full tests in 35 files** passed. The bounded-memory client/server build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) passed, with only the existing large-chunk warnings. GitHub-first publication and any managed checkpoint are verified separately in the external production ledger. This first-pass model stays query-gated and does not replace procedural gameplay.
