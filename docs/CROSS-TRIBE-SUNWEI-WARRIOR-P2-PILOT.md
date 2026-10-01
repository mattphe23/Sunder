# Sunwei Warrior — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in normal gameplay.** The owner's breadth-first direction remains in effect: cover the seven non-Nerivane rosters before making aesthetic revisions.

## Provenance

- The [Sunwei six-role concept lineup](https://app.scenario.com/assets?openAssetId=asset_uNgpbDtXyiz3gY6UDAPRA3A3) supplied a genuine isolated Warrior crop. The reference and locked turnaround prompt are archived outside Git under `cross-tribe/sunwei/warrior/`. The submitted prompt, without its trailing POSIX newline, matched SHA-256 `4a5494cd32fe9a6acd1083dd460e336a149dbbf36107bb950d72d20e3c73c887`. The authenticated reference asset was `asset_iAAQiQkEkozqcHqoCZZDGatu`.
- One authenticated Sunburst job [`job_5KTS56wFZNNw2Re8eJvyqcCG`](https://app.scenario.com/create?restartGeneration=job_5KTS56wFZNNw2Re8eJvyqcCG) generated [four-view asset `asset_MGFnGnMijahyioCvYjULVFgb`](https://app.scenario.com/assets?openAssetId=asset_MGFnGnMijahyioCvYjULVFgb) at native 3840×2160, one reference/image, Quality/Background Auto, displayed 18 CU. The archived PNG `sunwei-warrior-turnaround-v1.png` has SHA-256 `65b803d43e6debfbbf6d90876d85b1f47016ef9e045231109a9569984ec84a0d`. Front, left, back, and right were individually inspected and normalized into four 1024² inputs. A previous isolated worker reported a partial job without a durable task or verifiable source in this project; project task/asset history was checked before this single authenticated submission.
- Distinct Tripo P2 inputs: front `asset_ghqk9chdyeEpEo26n6o6rg2w`, left `asset_nBiLRnoUX33CwLrZB4q8WJZ2`, back `asset_bWHoMkZsrfPDz5NJorgjrqDx`, right `asset_rofiNkyjFaCfHeWzpuHip4eQ`. One [P2 Multi View job `job_wcGzKaw1hHT4JQ1Eh8xu8xPs`](https://app.scenario.com/create?restartGeneration=job_wcGzKaw1hHT4JQ1Eh8xu8xPs) produced [asset `asset_pef1PPu7X8gmcLFEeifiXhq8`](https://app.scenario.com/assets?openAssetId=asset_pef1PPu7X8gmcLFEeifiXhq8), seed `604246849`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit, displayed 220 CU.
- Original GLB master: `cross-tribe/sunwei/warrior/model/sunwei-warrior-tripo-p2-v1.glb` outside Git, SHA-256 `04b706f5410f9950792a2801c363099155cc8333012ab576c213c2af96696ab9`. Runtime URL `/manus-storage/sunwei-warrior-tripo-p2-v1_af991702.glb`; never bundle the binary in the repository or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,259 | Informational |
| Triangles | 4,858 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,171,352 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The original JSON audit is archived beside the GLB. The Scenario viewer counted 7,253 vertices and 4,858 triangles; the registry uses the downloaded binary auditor's 7,259 vertices.

## Visual review and routes

- [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=2#sunwei-warrior-comparison): `cross-tribe/sunwei/warrior/review/sunwei-warrior-procedural-vs-p2.png` contains 24 real rendered portraits across procedural and P2 full size, 40px color/grayscale, eight rotations, and occupied-hex scale.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,2,highlands&p2-candidate=sunwei-warrior): the authentic Sunwei Warrior `u5` at `(2,1)` became one `p2CrossTribePreview` node with zero page errors. Screenshot: `cross-tribe/sunwei/warrior/review/sunwei-warrior-live-board.png`. No normal-game starter behavior changed.
- **Strength:** the new low-poly armored figure has a distinct shield/crest silhouette, real rear/side geometry and a compact cracked plinth. **Risks:** at 40px and beside the much brighter procedural figure, muted brown/olive armor and a very small gold accent obscure the Sunwei harvest-gold identity. The generated blade is narrow/upright rather than a low diagonal wedge dao; the shield is elongated/oval rather than a compact dark rectangle with a bold split-sun wedge. The board rendering confirms the candidate is visible but substantially dimmer. Keep these as first-pass findings for the later cross-roster refinement, not a preemptive recolor or approval.

## Validation

- The actual Model Lab rendered **24 portraits**; the opted-in board loaded one authentic Warrior preview with zero page errors. The uploaded GLB proxy returned HTTP 307 to a signed storage URL.
- `pnpm check` and **22 focused imported-model tests** passed. A normal unflagged Sunwei match loaded the canonical Sunwei tribe and its hero, with **zero candidate GLB requests**, **zero imported preview nodes**, and zero page errors.
- The complete Sunder suite passed **270 tests in 35 files**. The Vite client and esbuild server production build succeeded. GitHub publication/checkpoint parity is performed only after final source-diff review.
