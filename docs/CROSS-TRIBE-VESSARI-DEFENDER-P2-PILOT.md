# Vessari Defender — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not aesthetically approved or enabled in ordinary gameplay.** This is the second non-Auren Defender study after seven non-Nerivane Warrior and Archer first passes. The imported GLB loads only on explicit review routes; procedural gameplay remains the default.

## Provenance

- Source: the isolated Vessari Defender from the original concept lineup, clean and complete at 1024×1024 (448,536 bytes; SHA-256 `fed41d6d2788294250cca82d4a1e29f51343ab0c90900a0346173be3be31dbd2`). Uploaded once as `asset_QCg6xyQYtyXqa2iiu6wW2ZTc`. Its long spear, small purple crest, dark kite shield with purple sigil, mask, pale cloth, and fractured base were preserved in the turnaround brief.
- The locked live Sunburst prompt was 1,947 characters, SHA-256 `4dd73fbe8da54bf77f7fe753ac586978142dffcc4a8e98c1a9e38341cea055c5`. One [3840×2160 Sunburst job `job_Anx4boaXVXXsjVkNFc5h9Ayf`](https://app.scenario.com/create?restartGeneration=job_Anx4boaXVXXsjVkNFc5h9Ayf) yielded [turnaround `asset_8zMhbL9rXHy6oCJqMnuGETuf`](https://app.scenario.com/assets?openAssetId=asset_8zMhbL9rXHy6oCJqMnuGETuf): one source, one output, Quality/Background Auto, displayed 18 CU. The native PNG is 7,026,813 bytes, SHA-256 `806ab36e1114742a8bb337703334c83e7160fb2e11dd5f791fb3abb4f816f576`. Front, left, back and right figures retain the shield, spear and base; the side views are near-profile rather than perfectly orthographic. Four full 1024² inputs were inspected and normalized without stretching.
- P2 assets: front `asset_1gHYjg6UKoDoo3VAwZg4CHFM`, left `asset_rzJFzxbESi9PpZhCeCkLyLxg`, back `asset_V7pzgeR6pjhXM2meK5bUoy9m`, right `asset_YZmbgQPP3uRctF63cfmhooS3`. One 220-CU non-Quad [Tripo P2 job `job_c2eEJa5aXJupfx2ZzjtmobN2`](https://app.scenario.com/create?restartGeneration=job_c2eEJa5aXJupfx2ZzjtmobN2) produced [3D asset `asset_2YedqmFoW12sJYZtTFCzWdL6`](https://app.scenario.com/assets?openAssetId=asset_2YedqmFoW12sJYZtTFCzWdL6), seed `1980713515`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit and seeds.
- Original GLB master `cross-tribe/vessari/defender/model/vessari-defender-tripo-p2-v1.glb` is archived outside Git: SHA-256 `416daa9f5ebb053763fb8509e541c304d510d77d8794297ebaeaa071817c1768`. Runtime `/manus-storage/vessari-defender-tripo-p2-v1_333cf8da.glb` returned HTTP 307 locally and publicly. No binary model was committed to the repository or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,891 | Informational |
| Triangles | 4,878 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,163,676 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Scenario's displayed vertex count is 6,889; the read-only accessor audit counts 6,891. The native `audit.json` remains beside the GLB master; the registry uses its exact audit count.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=3#vessari-defender-comparison): actual `cross-tribe/vessari/defender/review/vessari-defender-procedural-vs-p2.png` captures **24 rendered portraits**—full procedural/P2, 40px color and grayscale, eight rotations and approximate occupied-hex scale. The imported unit has a long thin spear and small dark shield with muted violet marks; the procedural Defender has a large frontal high-contrast purple panel and white double-chevron symbol.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,3,highlands&p2-candidate=vessari-defender): the real Babylon scene loaded one imported preview node `u7`, a Defender at `(6,2)` on grass beside the city and Vessari hero. Actual screenshot: `cross-tribe/vessari/defender/review/vessari-defender-live-board.png`. There were zero browser page errors. The catalog maps tribe index `3` to `defender`, not Archer or Warrior.
- **First-pass risks:** at 40px and in grayscale, the imported Defender is much smaller, almost charcoal-gray and less visibly violet than procedural art. The shield sits mostly side-on to the review camera, so its purple sigil and protective role cue fade; the spear and tapered mask/crest can read like a generic guard rather than a shield-heavy Defender. The plinth is closer to a rounded hex than a conspicuously fractured one. The shield becomes clearer in side rotations, but the board view is dark against neighboring mountains. Preserve these findings for lineup-level review; do not tune aesthetics before the remaining tribe-role first passes.

## Validation

- The native GLB audit passed, and the runtime storage proxy returned HTTP 307. `pnpm check`, **31 focused registry tests**, `git diff --check` and the live Model Lab/board capture passed; 24 portraits rendered and the actual board showed one correctly mapped Defender preview with no page errors.
- An unflagged Vessari board on seed 6104 retained one canonical hero with **zero imported GLB requests, zero preview nodes and zero page errors**. The full suite passed **279 tests in 35 files** and the production build passed (the existing Babylon bundle size warning remains). Technical integration is not owner aesthetic approval.
