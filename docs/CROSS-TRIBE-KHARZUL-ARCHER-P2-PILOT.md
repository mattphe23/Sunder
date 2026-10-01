# Kharzul Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** This is the sixth non-Auren Archer first pass in the breadth-first roster work. Imported models remain available only through explicit development review routes.

## Provenance

- The original isolated Kharzul Archer source had an overly tall ordinary-unit crest. An identity-preserving edited source shortened it while retaining the bow, mask, quiver, palette and fractured base. The inspected 1024² submitted PNG `kharzul-archer-short-crest-source-v1.png` (SHA-256 `85dd17ffb71b83710e408522fd1788609e836f413b762fe8668a4cee32de80b6`, 1,074,225 bytes) was uploaded as `asset_45i4cCWTsTY7FaXzNG35pzv9`; original and edit are outside Git. **Source caveat:** the mask is still substantially beaked and the red ordinary crest remains somewhat spiky. Do not treat this as final aesthetic approval.
- The locked Sunburst prompt matched live Scenario text without the final newline (SHA-256 `c2bea41badaaebbf3c0ba94f47421b6d36f6a669cdd82d8ba0c57e0428e71d97`). One [3840×2160 Sunburst job `job_orCZDVVLz6nY64gu2X3LfFbA`](https://app.scenario.com/create?restartGeneration=job_orCZDVVLz6nY64gu2X3LfFbA) produced [turnaround `asset_D1mcvYHPSU9hpiXtvJ65DeWa`](https://app.scenario.com/assets?openAssetId=asset_D1mcvYHPSU9hpiXtvJ65DeWa): one source, one output, Quality/Background Auto, displayed 18 CU. Native PNG 8,030,360 bytes, SHA-256 `4c9d9c2e254e26dff88746a6ae5e192e10d940ff4bc31a4d5d71682fc25f6bcf`. Its front, left, back and opposite-right views were inspected and normalized without stretching to four 1024² P2 crops.
- P2 view assets in order: front `asset_ab2WMXy5wby2LHfoA4C7oh2h`, left `asset_PtoN3AxB3XMhonfwbwrzsj3Z`, back `asset_hNzmXRSm7mfkV3aK8Vbf4RRQ`, right `asset_2yF36etRD711bi9cgE8foh1d`. One 220-CU non-Quad [Tripo P2 job `job_KSApH75bxjByGAWUUHmGYaDX`](https://app.scenario.com/create?restartGeneration=job_KSApH75bxjByGAWUUHmGYaDX) produced [3D asset `asset_gFTUWnhneufVBjVATNDdcWWU`](https://app.scenario.com/assets?openAssetId=asset_gFTUWnhneufVBjVATNDdcWWU). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit.
- Native GLB master `cross-tribe/kharzul/archer/model/kharzul-archer-tripo-p2-v1.glb` is archived outside Git: SHA-256 `aac409be47a85c557a059dd2b118348c666252dc2fbe7febeb8cb30ca13a37ad`. Runtime `/manus-storage/kharzul-archer-tripo-p2-v1_8ff6d78c.glb` returns HTTP 307. No binary model was added to the repository or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,103 | Informational |
| Triangles | 4,772 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,330,404 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The native GLB audit JSON is archived beside the master.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=1#kharzul-archer-comparison): actual `cross-tribe/kharzul/archer/review/kharzul-archer-procedural-vs-p2.png` includes **24 rendered portraits**—full procedural/P2, 40px color and grayscale, eight rotations and approximate occupied-hex scale. The imported model has a distinct layered armored figure with bow, back quiver and red arrow fletching visible across side/rear rotations.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6105,11,1,highlands&p2-candidate=kharzul-archer): the genuine Babylon scene loaded one preview node for opening Archer `u3` at `(2,9)` on unobscured grass beside the city and canonical Kharzul hero, with no page errors. Actual screenshot: `cross-tribe/kharzul/archer/review/kharzul-archer-live-board.png`. Catalog slug maps tribe index `1` to `archer`, not Warrior or hero. Normal gameplay remains procedural.
- **First-pass risks:** at 40px the imported figure reads much smaller, darker and less red than the procedural Archer; its bow is hidden behind the frontal pose and is barely visible on the live board, so the role can be mistaken for an armored foot unit. Side and rear rotations carry more of the bow/quiver identity. The source's beaked mask and still-spiky red crest, plus a rounded/blocky stone base rather than a clearly standardized fractured hex, remain roster-level discussion points. Do not treat technical integration as aesthetic approval.

## Validation

- Native GLB passed objective budget audit; runtime storage proxy returned HTTP 307. `pnpm check` and **29 focused registry tests** passed; Model Lab rendered 24 portraits and the opt-in Kharzul board showed one Archer `u3` preview and zero page errors.
- On an unflagged Kharzul board with seed 6105, the canonical hero remained present with **zero imported GLB requests, zero preview nodes and zero page errors**.
- Full **277-test/35-file** suite, Vite/server production build and `git diff --check` passed. The existing large-chunk advisory is unrelated to this opt-in model. No aesthetic approval or normal gameplay substitution is implied.
