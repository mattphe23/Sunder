# Vessari Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved or enabled by default.** The owner requested a breadth-first pass across the non-Nerivane roster before aesthetic tweaks. The imported asset can render only on explicit development review routes.

## Provenance

- The [Vessari concept lineup](https://app.scenario.com/assets?openAssetId=asset_vdurdQ5jKgW9qjk9vFaQGtNL) supplied one isolated 1024² Archer reference, Scenario `asset_KQEfoswxjadHtSiagbUuoseu`. Source, locked prompt and all native media are archived outside Git under `cross-tribe/vessari/archer/`. The live Sunburst prompt matched the locked prompt SHA-256 `66f703d8c1e0a8aebeacc040fa9a104b051670a1f31ef7f9be0d5550597f617f` without the POSIX terminal newline.
- Exactly one 3840×2160 [Sunburst job `job_2AGXFZ2UKXcLdt5ecvHTKjPZ`](https://app.scenario.com/create?restartGeneration=job_2AGXFZ2UKXcLdt5ecvHTKjPZ) produced [turnaround asset `asset_tonadXttoCUrrTGMwmDkJ9e4`](https://app.scenario.com/assets?openAssetId=asset_tonadXttoCUrrTGMwmDkJ9e4). One real reference, one output, Quality/Background Auto, displayed 18 CU. The 7,500,522-byte native PNG has SHA-256 `37fdc5ab86d8c76695c22b6e2a1accd59078db87dc434d7d3742c80383584ed0`. The four actual opposing front/left/back/right views were inspected and normalized into distinct 1024² P2 inputs without stretching.
- P2 assets in slot order: front `asset_sETpFQnnMccjBnFLqjtKsyrr`, left `asset_FAsYLga3H7T2uARFcJnoea31`, back `asset_AoKUTudT483oVuYLnxKJzJvx`, right `asset_oTC1wn4rJjujKyxwMqFiigvZ`. One 220-CU non-Quad [Tripo P2 job `job_7pdUu9RXmF8f3WgzUx534HgB`](https://app.scenario.com/create?restartGeneration=job_7pdUu9RXmF8f3WgzUx534HgB) produced [3D asset `asset_TBuK3UTJKU9ztSs3T1EiWL9v`](https://app.scenario.com/assets?openAssetId=asset_TBuK3UTJKU9ztSs3T1EiWL9v), seed `1800820781`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version and blank face limit.
- Native GLB `cross-tribe/vessari/archer/model/vessari-archer-tripo-p2-v1.glb` stays outside Git, SHA-256 `5a5cec4f677d8711f8613a4ec2ea387dae7418ab72196491039f121ce081fb7a`. Runtime storage path `/manus-storage/vessari-archer-tripo-p2-v1_a629c752.glb` returned HTTP 307. Never place the GLB in `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,630 | Informational |
| Triangles | 4,627 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,340,612 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Scenario displayed 6,625 vertices, while the native GLB accessor audit counted 6,630; both agreed on 4,627 triangles. The registry uses the actual GLB audit values; audit JSON is archived beside the native model.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=3#vessari-archer-comparison): actual `cross-tribe/vessari/archer/review/vessari-archer-procedural-vs-p2.png` renders **24 portraits**—full-size procedural/P2, 40px color and grayscale, eight rotations each and approximate occupied-hex scale.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,3,highlands&p2-candidate=vessari-archer): the real Babylon scene renders a single review preview node for the authentic opening Archer `u7` at `(6,2)` on grass, next to the canonical hero, with no browser page errors. Actual capture: `cross-tribe/vessari/archer/review/vessari-archer-live-board.png`. No default-game unit placement or gameplay rules changed.
- **Strength:** the bow and rear streamers remain visible at larger size and from profile/back rotations; the model is a coherent Archer rather than a duplicate Warrior. **First-pass risks:** at 40px the imported Archer is much smaller and darker than the bright-purple procedural unit. Its bow is thin and may vanish front-on or in grayscale, and the Vessari violet cue is concentrated in a small crest/streamer rather than a readable sash. On the real board, the dark armor blends with nearby mountain tones and the base appears rounded rather than a clearly fractured hex. Preserve these as cross-tribe comparison findings, not aesthetic approval or a license for early tweaks.

## Validation

- `pnpm check` and **25 focused imported-model registry tests** passed. The Model Lab rendered all 24 portraits; the real opt-in Babylon board loaded authentic Archer `u7` with a preview node and zero page errors; the storage proxy returned HTTP 307.
- The ordinary unflagged Vessari board retained one canonical hero and its procedural units with **zero imported GLB requests**, **zero preview nodes** and zero page errors.
- Full suite: **273 tests in 35 files** passed. The Vite/server production build and final `git diff --check` completed successfully; no approval or default substitution is implied.
