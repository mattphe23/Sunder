# Vessari Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** This is the second non-Nerivane Rider in the breadth-first wave. Sunder's procedural Vessari Rider remains the default. Other Rider, unique-unit and hero roles, plus unrelated project TODOs, remain incomplete.

## Provenance

- Original Vessari Rider source: `cross-tribe/vessari/vessari-rider-source.png` outside Git, 1024×1024, 558,025 bytes, SHA-256 `6650cf0a8f29ce13f88b6601e60ffcb3ab594a0b101c8570844e5e2eb3303833`; unchanged. Source-faithful four-view prompt: 2,668 characters, SHA-256 `c71998918155237f424c559a775cd6a500ab97aa7a6a14112266723b0c37c8b3`. An earlier mismatched design brief was preserved but not submitted. A tiny detached purple source speck near the front hoof was not silently erased.
- Exactly one 18-CU [Sunburst job `job_LgCTJBwX5e4Nn44hMrzpGRA4`](https://app.scenario.com/create?restartGeneration=job_LgCTJBwX5e4Nn44hMrzpGRA4) produced [image `asset_W3Y5xLXd23JMzYASX4nHQEuL`](https://app.scenario.com/assets?openAssetId=asset_W3Y5xLXd23JMzYASX4nHQEuL), using only reference `asset_zRQg4DKZKFfmKWCK9gmAs4DX`, one native 3840×2160 output and Quality/Background Auto. Archived PNG: 7,410,105 bytes, SHA-256 `f4ddc6e830f8dae8552cdcbc8c4f8ed5aeb183be25a26911d0da2b51a3e88bc9`.
- Four independently inspected unstretched 1024² inputs preserve the same masked rider, tall violet crest, upright spear, brown horse, purple saddle drapery and stone base: Front `asset_GNxNqkpRfiSZTCqwaBT4o2X7`, Left `asset_MxjEpJ9utbbjm2jwL78XazZ6`, Back `asset_crwguNTBuar3EhP6nJ1ZU32X`, Right `asset_o3kKK3NdJCbVLAWz6YTKAmqa`. A thin studio-column seam appears outside the subject in the back crop; all equipment and hooves remained intact. These are distinct views, not duplicated front images.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_cYCZkmBY1GezNCWcL5vwg8Nm`](https://app.scenario.com/create?restartGeneration=job_cYCZkmBY1GezNCWcL5vwg8Nm) produced [3D asset `asset_uM254DMFypPTGURMtnCJEWfj`](https://app.scenario.com/assets?openAssetId=asset_uM254DMFypPTGURMtnCJEWfj), seed `1635327757`. Texture/PBR/Delight on, Auto Size/Quad off; Standard quality, Original Image alignment, default version/orientation and blank face limit/seeds.
- Original GLB master: `cross-tribe/vessari/rider/model/vessari-rider-tripo-p2-v1.glb` outside Git, 3,519,888 bytes, SHA-256 `1b144911405ef232ac0a7324c2b6a0f85105071ece493adaa702387fe3ff7e80`. Archived from the exact asset viewer's signed `model/gltf-binary` resource with verified content type, byte length and glTF header. `/manus-storage/vessari-rider-tripo-p2-v1_d1b5684e.glb` returned HTTP 307 locally and publicly; no binary media was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 8,071 | Informational |
| Triangles | 5,303 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,519,888 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Bounds approximately 0.593×1×0.407; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=3#vessari-rider-comparison): `cross-tribe/vessari/rider/review/vessari-rider-procedural-vs-p2.png` contains **24 actual rendered portraits**: full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. The import has a recognizable upright spear, helmet crest and horse-mounted silhouette, with more anatomical detail than the procedural block form. Its dark beige-violet coloring and small figure scale are **far less vibrant and conspicuous** than the bright purple procedural Rider. At 40px and grayscale the spear remains thin and team color nearly disappears. The stone base is rounder and more massive than the intended fractured hex, while the procedural Rider's large bright pennant has no counterpart in the source-faithful P2 image. These are candid first-pass risks, not an aesthetic approval.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,3,highlands&p2-candidate=vessari-rider): actual Babylon scene with imported preview node `u7` at `(6,2)` next to the Vessari capital and canonical procedural hero, surrounded by mountains. Top bar and captured game state both identify Vessari (tribe index 3). Screenshot: `cross-tribe/vessari/rider/review/vessari-rider-live-board.png`. The horse and spear are coherent at board scale but the model is quite small and low-contrast against terrain relative to its procedural counterpart. Scenario's WebGL screenshot was unreliable; this judgment uses the real Babylon rendering.
- An **unflagged** Vessari game at the same seed retained one canonical hero, **zero imported GLB requests, zero imported preview nodes and zero page errors**. Imported media remains query-gated and opt-in.

## Validation

- Original GLB integrity/mobile audit, local/public HTTP 307 redirects, `pnpm check`, **37 focused imported-model registry tests**, 24 genuine Babylon Model Lab portraits, Vessari board identity, unflagged negative control and `git diff --check` passed. The **full suite passed: 285 tests in 35 files**. The bounded-memory production client/server build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully, with only large-chunk warnings. Technical integration does not imply owner aesthetic approval.
