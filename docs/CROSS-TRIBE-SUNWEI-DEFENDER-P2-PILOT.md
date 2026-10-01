# Sunwei Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not owner-approved and not enabled in ordinary gameplay.** This is a breadth-first Defender study, not a replacement for Sunder’s procedural Sunwei Defender. Only explicit review routes request the imported GLB.

## Provenance

- The full isolated Sunwei Defender reference is clean at 1024×1024, 665,378 bytes, SHA-256 `dd48dc0be1e751a5f2b82811ba6a670f23ec3544443286b7cac6c097900d31b9`; Scenario reference `asset_KBuPfP1Vx8PtZRgLdq8X6zdk`. Its large pointed shield with gold sun, long upright stone-headed polehammer, short gold crest and cracked base differed from an earlier design-brief prompt, which was preserved separately. The actual source—not an invented alternate shield—governed the locked one-canvas prompt (2,654 characters; SHA-256 `e8c5d7bbfbbf021801f195e3a3cf6ec780e4779f574c4ccf911c3b6b01f78181`).
- One 18-CU [Sunburst job `job_FRwbpGsfZaDyXJEwteMVygBT`](https://app.scenario.com/create?restartGeneration=job_FRwbpGsfZaDyXJEwteMVygBT) generated [image `asset_jxEuRuCuFEWVchLZRaWkpZwp`](https://app.scenario.com/assets?openAssetId=asset_jxEuRuCuFEWVchLZRaWkpZwp): one reference, one output, physical 3840×2160, Quality/Background Auto. The native PNG is 8,231,760 bytes, SHA-256 `47f12ec219fafbe06484cfa8bc76be3418a2cff2dcd21cd1620eacc874ee038e`. Front/left/back/right geometry, equipment and bases were independently inspected; four unstretched 1024² crops were archived outside Git. The generated base is somewhat rounder than the fractured-hex target.
- Four independently uploaded P2 assets: front `asset_tdi4dJw3yxowkYVnjnto9mVG`, left `asset_VeX2jKtJstigvpagsTXuRznJ`, back `asset_PnqL5vyegjNRHiyAnyGYBcMn`, right `asset_wJKKeepntFPmDjDfNypDcckk`. Exactly one 220-CU non-Quad [Tripo P2 job `job_RDztWzadJZKrdBV7CJ3ake94`](https://app.scenario.com/create?restartGeneration=job_RDztWzadJZKrdBV7CJ3ake94) produced [3D asset `asset_qPrvb3YcC2sD4MzhYV5BV4Hs`](https://app.scenario.com/assets?openAssetId=asset_qPrvb3YcC2sD4MzhYV5BV4Hs), seed `1255775511`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit and seeds.
- Original GLB master: `cross-tribe/sunwei/defender/model/sunwei-defender-tripo-p2-v1.glb` outside the repository, SHA-256 `e958fdef90e45f097bfcd0d65fe29fc03a6fe59d10a0a2f43f966f7c7d897967`. The runtime path `/manus-storage/sunwei-defender-tripo-p2-v1_e386fdc1.glb` returned HTTP 307 locally and publicly; no binary model was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,163 | Informational |
| Triangles | 4,551 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,072,148 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Scenario’s viewer reports 7,137 vertices; the read-only GLB accessor audit reports 7,163. `audit.json` remains with the original master; the registry uses its exact accessor count.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=2#sunwei-defender-comparison): `cross-tribe/sunwei/defender/review/sunwei-defender-procedural-vs-p2.png` captures **24 real rendered portraits**, including full-size procedural/P2, 40px color and grayscale, eight rotations, and occupied hexes. The original large shield/polehammer silhouette survives in the model. At 40px, the imported gold is concentrated in the narrow emblem/crest rather than the larger bright procedural shield face; its dark stone armor and shield shrink and lose contrast in grayscale.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,2,highlands&p2-candidate=sunwei-defender): the actual Babylon scene rendered imported preview node `u5`, a Defender on grass at `(2,1)` beside the city and Sunwei hero. Actual screenshot: `cross-tribe/sunwei/defender/review/sunwei-defender-live-board.png`; zero browser page errors. Its face and polehammer read clearly when magnified but the imported figure is smaller and less saturated than nearby procedural models. The low stone plinth appears rounded; the gold rune is subtle.
- The model is intentionally retained as a **first pass**. The source-faithful shield differs from the earlier stepped-shield design brief; whether to revise that silhouette is the owner’s later roster-level decision, not an automatic aesthetic approval or tuning request. Do not make a default-gameplay swap.

## Validation

- Original GLB audit, local/public storage proxy, `pnpm check`, **32 focused registry tests**, `git diff --check`, 24 live portraits and a real query-gated board capture all passed. An unflagged Sunwei board kept one canonical hero with **zero imported GLB requests, zero preview nodes and zero page errors**. The full suite passed **280 tests in 35 files**, and the production build passed (the existing large Babylon bundle warning remains). Technical integration is not owner aesthetic approval.
