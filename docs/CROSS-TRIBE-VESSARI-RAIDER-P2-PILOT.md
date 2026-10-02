# Vessari Raider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** The Vessari unique unit maps to actual gameplay `UnitType` `raider` in tribe 3, separately from the ordinary `rider`. The imported model can be requested only through explicit development review routes; the default Raider and all other ordinary units remain procedural. Remaining specialists, heroes, landscape work and TestFlight are separate follow-ups.

## Provenance

- The original `cross-tribe/vessari/vessari-raider-source.png` remains untouched outside Git: 1024×1024, 752,260 bytes, SHA-256 `77e9e3af8adfa826675c93e1cda79eaa37778ede6743228147f701c0ab42f959`. It depicts an ivory beaked mask, vertical violet crest, charcoal armor, one hooked axe, a torn forked violet pennant, hip rope coil, brown galloping horse with dark mane and pale blaze, and a gray fractured hex with violet fissure. The old source-mismatched brief was archived unused; the locked source-faithful turnaround prompt has SHA-256 `8ad36b2971e221b270bd8a3d92d14a221b8aab64721c371f42fa7b4ff1506d70`.
- Exactly one 18-CU [Sunburst job `job_M4ywoKVh9UDFHrinMvCEE4Q8`](https://app.scenario.com/create?restartGeneration=job_M4ywoKVh9UDFHrinMvCEE4Q8) used one durable original source `asset_iWDxubsxu87rd5ysEkBJ15nG`, the locked prompt, one native 3840×2160 canvas, Auto quality and Auto background. [Sheet `asset_AY25mCMt1V9AChmyYZGN4oR2`](https://app.scenario.com/assets?openAssetId=asset_AY25mCMt1V9AChmyYZGN4oR2) was archived unchanged outside Git: 7,905,192 bytes, SHA-256 `e92b27ae621351aaa1ff46b387d6b704be851897ed4b9040a38ed8c7a74912f2`. Equal-column draft crops were **rejected** for neighboring-figure contamination and clipped muzzle/flag. A reproducible measured-seam cropper at x=850, 1975, 2660 produced four independently inspected, unstretched 1024² Front/Left/Back/Right inputs preserving the mount, equipment and base.
- Exactly one 220-CU non-Quad [Tripo P2 Multiview job `job_xRgCBbiWxBKYfMvHx1nBeDk4`](https://app.scenario.com/create?restartGeneration=job_xRgCBbiWxBKYfMvHx1nBeDk4) produced [3D asset `asset_AqYTZ4dcJfBSoTPyDv5ejHAR`](https://app.scenario.com/assets?openAssetId=asset_AqYTZ4dcJfBSoTPyDv5ejHAR), seed `2020619689`. Four separately uploaded durable inputs were Front `asset_85wWpB2RQWid8HqhKL7BxB3c`, Left `asset_AvMfBZcPfDu8aALK7GKnCvsn`, Back `asset_5BTKCGYueiL1bhEGxfDGxPZ2`, Right `asset_ayQUPzUZ6dKEzC3bsfzzwrKd`. Texture/PBR/Delight on; Auto Size/Quad off; Standard, Original Image, default orientation/version, blank seed and face limit. No duplicate job or 230-CU Quad run.
- The exact signed **original** GLB is archived outside Git at `cross-tribe/vessari/raider/model/vessari-raider-tripo-p2-v1.glb`: 3,510,336 bytes, SHA-256 `daf3e6180ee96e5994799aa9f78a48bdb323889cb55eac1de5073aed3f7889f9`. Its own viewer's signed resource passed HEAD `model/gltf-binary` and exact byte length before byte-preserving archive. Managed runtime path `/manus-storage/vessari-raider-tripo-p2-v1_1999984e.glb` returned HTTP 307 locally and from the public preview. No binary media was placed in Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 8,721 | Informational |
| Triangles | 5,466 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,510,336 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. No model retouching was performed. Hidden-side modeling is generated from a single original three-quarter view, not a documented original back/left design.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=3#vessari-raider-comparison): actual screenshot `cross-tribe/vessari/raider/review/vessari-raider-procedural-vs-p2.png` contains **24 Babylon-rendered portraits**: full-size procedural/P2, 40px color/grayscale, eight rotations each and occupied hexes. The candidate preserves a mounted horse, rider's crest and long pennant silhouette. It is noticeably **smaller, grayer/browner and far less violet** than the blocky procedural Raider. At 40px and in grayscale the hooked axe, rope and purple team cue nearly disappear; from the front the tall pennant can read as a narrow staff. The base is a raised, irregular stone slab rather than a clear fractured hex. These are deferred aesthetic risks, not owner acceptance.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,3,highlands&p2-candidate=vessari-raider): real Vessari game at seed `6104`, genuine Raider `u7` on grass `(6,2)` with preview node `u7`, retained procedural hero, zero page errors. Screenshot `cross-tribe/vessari/raider/review/vessari-raider-live-board.png` shows the mount largely unobstructed next to a city and a much larger purple procedural hero. The purple banner and base fissure are subtle against gray highlands; no regenerated art or alternate seed was needed.
- The same-seed **unflagged** Vessari game retained one canonical hero, **zero imported candidate GLB requests, zero preview nodes and zero page errors**. The GLB remains query-gated/opt-in only.

## Validation

Exact source/crop QA, original-GLB audit, local/public storage redirects, `pnpm check`, **44 focused registry tests**, genuine 24-portrait/board capture, same-seed normal-game negative control and **292 full tests in 35 files** passed. The bounded-memory client/server production build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) passed with only large-chunk warnings. The diff/scope check covers only the registry, focused test and this document; binary media remains external. GitHub-first publication and any managed checkpoint are verified separately in the external production ledger. This first-pass technical integration does not imply owner aesthetic approval or default-game replacement.
