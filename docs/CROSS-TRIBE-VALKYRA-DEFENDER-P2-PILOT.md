# Valkyra Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** This starts the non-Auren Defender wave after all seven non-Nerivane tribes obtained first-pass Warrior and Archer comparisons. Imported models remain available only through explicit development review routes.

## Provenance

- Source: the isolated Valkyra Defender from the original concept lineup. Two disconnected neighboring fragments at the crop margins were interpolated from adjacent original background by `valkyra/defender/repair-source-edge-fragments.py`; the central figure, shield, hammer, mask and base pixels are byte-identical to the original. The inspected repaired 1024² source (761,312 bytes, SHA-256 `53ed3fcc3bac2a6e6b9e129107e4637128bb859d949e4af9e8c70803cbb2875d`) was uploaded once as `asset_r6aeSy7ZMMSDm3zAw1ySHf28`. Original, reproducible repair script and output remain outside Git.
- The locked Sunburst prompt matched live Scenario text without its final newline (SHA-256 `9446cd98a530e620c3ca751bfe39ea7cfdb3f9cb312634067ce265b429f75a2b`). One [3840×2160 Sunburst job `job_MAeWi8FmQfnDudZRpBnmG6GL`](https://app.scenario.com/create?restartGeneration=job_MAeWi8FmQfnDudZRpBnmG6GL) yielded [turnaround `asset_vv7PTgQZ4mtfPFDP29C1oTVb`](https://app.scenario.com/assets?openAssetId=asset_vv7PTgQZ4mtfPFDP29C1oTVb): one source, one output, Quality/Background Auto, displayed 18 CU. The native PNG has 7,777,112 bytes, SHA-256 `55a2fe23ccd73faf6061e92c292b2180bb22bfbea1812c888335415604e91059`. Front, left, back and opposite-right views were inspected and normalized without stretching into four 1024² P2 crops.
- P2 assets: front `asset_rB1jTJHxatAtcW4yVjFq9XzS`, left `asset_F12xxYEXVhKahJScG6jQHJA9`, back `asset_kCNLUQ7kn5BUzTtP5SZVcv5q`, right `asset_9swZ8HoR2nLhiFWCr8LywNd5`. One 220-CU non-Quad [Tripo P2 job `job_DrdsTdpqbJ4dzP78gMZA1k2M`](https://app.scenario.com/create?restartGeneration=job_DrdsTdpqbJ4dzP78gMZA1k2M) produced [3D asset `asset_D3DLdcPWMhHRRq8T1PxunKWd`](https://app.scenario.com/assets?openAssetId=asset_D3DLdcPWMhHRRq8T1PxunKWd). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit.
- Native GLB master `cross-tribe/valkyra/defender/model/valkyra-defender-tripo-p2-v1.glb` is archived outside Git: SHA-256 `c8b022ba862d54478c2ff90cf3fa22188d02ee41b6c8422bddc0d7f0f4230e0f`. Runtime `/manus-storage/valkyra-defender-tripo-p2-v1_02d56868.glb` returned HTTP 307. No binary model was added to the repository or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,391 | Informational |
| Triangles | 4,655 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,652,184 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The native GLB audit JSON is archived beside the master.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=6#valkyra-defender-comparison): actual `cross-tribe/valkyra/defender/review/valkyra-defender-procedural-vs-p2.png` contains **24 rendered portraits**—full procedural/P2, 40px color and grayscale, eight rotations and approximate occupied-hex scale. The imported model shows layered plate, a tall blunt crest, side-held shield and faint cyan rune marks on its stone base. The procedural unit instead carries a large bright rectangular shield with a strong white bolt mark.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,6,highlands&p2-candidate=valkyra-defender): the genuine Babylon scene loaded one preview node for opening Defender `u1` at `(10,7)` on grass beside the city and canonical Valkyra hero. Actual screenshot: `cross-tribe/valkyra/defender/review/valkyra-defender-live-board.png`. There were no page errors. The catalog maps tribe index `6` to `defender`, not the Warrior, Archer or canonical hero. Normal gameplay remains procedural.
- **First-pass risks:** at 40px, in grayscale and on the actual board, the imported Defender is smaller, much darker and substantially less sky-blue than the procedural counterpart. Its side-oriented narrow shield lacks the bold high-contrast white bolt; at default camera angle the shield reads more like additional dark armor, weakening the Defender role cue. The imported base is rounder than the desired fractured-hex convention and its tall crest may encroach on special-unit silhouette space. Shield and hammer read better across side rotations than front-on. Preserve these as lineup-level findings; do not revise aesthetics before the remaining non-Nerivane roles are first-pass reviewed.

## Validation

- Native GLB passed the objective audit and runtime storage proxy returned HTTP 307. `pnpm check`, **30 focused registry tests** and `git diff --check` passed. Model Lab rendered 24 portraits; the opt-in board showed one Defender `u1` preview and zero page errors.
- An unflagged Valkyra board on seed 6104 retained one canonical hero with **zero imported GLB requests, zero preview nodes and zero page errors**. The full **278-test/35-file** suite, production build and final diff check passed. The existing large-chunk advisory is unrelated to the opt-in model. Technical integration is not owner aesthetic approval.
