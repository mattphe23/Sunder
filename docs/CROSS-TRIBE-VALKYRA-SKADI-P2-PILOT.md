# Valkyra Skadi — Scenario P2 first-pass hero review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** Skadi is Valkyra's named hero, mapped to the actual gameplay `UnitType` `hero` in tribe 6. Only the explicit development-review route can request this GLB; the canonical procedural hero remains the default. Other specialist and hero candidates, then landscape cleanup, remain in the breadth-first queue.

## Provenance

- The immutable source `cross-tribe/valkyra/valkyra-skadi-source.png` is 1024×1024, 525,503 bytes, SHA-256 `99e09ddf2b4a36b075224ad558193a4e5469516301c4f11f674805ef9b09ab7c`. It shows a faceted ivory mask, tall pointed silver storm crown with cyan brow gem, deep-navy layered armor/tabard, one dark-brown staff with navy lightning pennant and spear tip, and a cracked gray plinth with cyan fissure. **No shield, mount or extra weapon is present.** It supplies a front-facing source only: generated side and rear views are provisional interpretations, not authoritative unseen-side evidence. Its pale background has a faint rectangular tonal artifact not meant to carry into the 3D model. A superseded brief that invented a shield/cape additions was archived unused. The source-faithful locked prompt SHA-256 is `af3c305061ca09a686cf35e3593f5a29106eb9b8d1ba7aba4974060e0e5526e5`.
- Exactly one 18-CU [Sunburst job `job_d7nLh5ZwxDRLgmj6MfGnZsbj`](https://app.scenario.com/create?restartGeneration=job_d7nLh5ZwxDRLgmj6MfGnZsbj) used the sole durable reference `asset_rzzrHSbtQEZo8BucFiWymzmC`, the exact locked prompt, one native 3840×2160 image, Auto quality and Auto background. [Sheet `asset_7DjsVfpjMJDqUbPzzRBfQAGN`](https://app.scenario.com/assets?openAssetId=asset_7DjsVfpjMJDqUbPzzRBfQAGN) is archived unchanged outside Git: 7,530,336 bytes, SHA-256 `d56d44e89e7a3052f4adca22c0e4640585f6539644218dd3679eaf4ce0c0f2cc`. A reproducible nonuniform, measured-blank-seam cropper produced independently inspected 1024² Front/Left/Back/Right images with full spear tip, pennant, boots and plinth; raw equal 960px columns were not used.
- Exactly one 220-CU non-Quad [Tripo P2 Multiview job `job_uwqJVZGYoSChyCmLEuFNFiGW`](https://app.scenario.com/create?restartGeneration=job_uwqJVZGYoSChyCmLEuFNFiGW) yielded [3D asset `asset_YUMkCC8p146AWCXTQinRYpSo`](https://app.scenario.com/assets?openAssetId=asset_YUMkCC8p146AWCXTQinRYpSo), seed `61710169`. Four distinct durable slot selections were Front `asset_QgWphSkVQ1cmVtaHiyzUEvte`, Left `asset_cqLRZhFJ83JXrbV7tpMZaY5s`, Back `asset_6BrHxBQxbuBWXvoEMeiVGx6L`, Right `asset_Xs7PW8XrpnbeeZQc5PUQAuZu`. Texture/PBR/Delight on, Auto Size/Quad off, Standard quality, Original Image alignment, default orientation, blank version/face limit/seeds. No duplicate or 230-CU Quad job.
- The original GLB came **from that exact 3D asset viewer's GLB menu**. The asset-ID-bearing browser download name, 3,376,220-byte length, GLB v2 header and reported length were verified, then identical bytes archived outside Git at `cross-tribe/valkyra/hero/model/valkyra-skadi-tripo-p2-v1.glb`: SHA-256 `6bd7cf15817f4a53b15324cb617b96ebf85bfe9afce02b12ffc2b1ec1a93ebe1`. This is a viewer-originated native download; no signed-URL HEAD MIME claim is made. Managed runtime path `/manus-storage/valkyra-skadi-tripo-p2-v1_80cb7846.glb` returned HTTP 307 locally and on the public preview. No binary media entered Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,430 | Informational |
| Triangles | 4,691 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,376,220 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. This GLB has not been retouched. The viewer's metadata showed 6,425 vertices, while the original GLB audit counts 6,430 position accessor vertices; the archive audit is the registry source of truth.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=6#valkyra-skadi-comparison): genuine `cross-tribe/valkyra/skadi/review/valkyra-skadi-procedural-vs-p2.png` contains **24 Babylon-rendered portraits** with full procedural/P2 views, 40px color/grayscale, eight rotations each and occupied-hex scale. The imported model has a clear tall dark crown, ivory mask, staff-and-blue lightning pennant, navy coat and complete modeled rear. Relative to the bright, blocky procedural hero, it is much slimmer, darker and less saturated; its crown/pennant mark and blue fissure nearly disappear at 40px, especially in grayscale. The raised uneven stone base reads less like a sharp fractured hex. These are deferred readability/style risks, not aesthetic acceptance or a request to regenerate immediately.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,6,highlands&p2-candidate=valkyra-skadi): real Valkyra game seed `6104` rendered imported preview `u2` beside the canonical procedural hero, with zero page errors. In `cross-tribe/valkyra/skadi/review/valkyra-skadi-live-board.png`, the full Skadi model and pennant are visible on the neighboring grass hex; highland stone spires and the brighter canonical hero compete visually with her muted navy/silver colors. The authentic first board was sufficient; no alternate seed or art regeneration was used.
- The same-seed **unflagged** Valkyra game retained one canonical hero, **zero imported candidate GLB requests, zero preview nodes and zero page errors**. This candidate is opt-in/query-gated only, not a normal-gameplay replacement.

## Validation

Exact source/crop QA, original-GLB integrity and mobile audit, both managed-storage redirects, `pnpm check`, **46 focused registry tests**, genuine 24-portrait/board capture, same-seed zero-import negative control and **294 full tests in 35 files** passed. The client/server production build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) passed with only existing large-chunk warnings. GitHub-first publication and any managed checkpoint are tracked separately in the external production ledger. This first-pass model stays query-gated and does not replace procedural gameplay.
