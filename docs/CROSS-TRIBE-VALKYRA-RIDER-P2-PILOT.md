# Valkyra Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not owner-approved and not enabled in ordinary gameplay.** This begins the remaining non-Nerivane Rider breadth-first wave, not a replacement for Sunder’s procedural Valkyra Rider. Only explicit review routes load this GLB. Other Rider, unique-unit and hero roles, plus unrelated project TODOs, remain incomplete.

## Provenance

- Original Valkyra Rider source: `cross-tribe/valkyra/valkyra-rider-source.png` outside Git, 1024×1024 RGB, 553,563 bytes, SHA-256 `1205e3b4e82b3e376675f0692250511ad1f9faf45a3aa6390114b36b5997edae`; unchanged. Its source-faithful prompt is 2,860 characters, SHA-256 `d798c71a4809c6b22d1ecc135637a52d29008b8b2abcdfa3817f8bd1cf28bb37`; the earlier source-inconsistent design brief was archived, not submitted. A small gray tab near the pennant may be a fastener, so it was not silently erased.
- Exactly one 18-CU [Sunburst job `job_JPQoAk4KT6ppzAJwv9CnjboL`](https://app.scenario.com/create?restartGeneration=job_JPQoAk4KT6ppzAJwv9CnjboL) produced [image `asset_4G94YpV1BkdneWj1CF5Tg5Ro`](https://app.scenario.com/assets?openAssetId=asset_4G94YpV1BkdneWj1CF5Tg5Ro), using only reference `asset_sAwZXXC7H6FvK9vcUKz5Xmse`, one native 3840×2160 output and Quality/Background Auto. Original PNG: 8,094,030 bytes, SHA-256 `0d81da933cfd2179df996695d1e2943aa0b1f1619013b6d1d37434e645c699af`.
- Four inspected unstretched 1024² inputs retained the same horned ram, masked rider, tall crest, single-point spear, lightning pennant and base: Front `asset_Q9kzTZXmFGZ7WRy1ee2CLgBr`, Left `asset_Tg13RM6Y3PceXt9S8eynV4Un`, Back `asset_e6yNYK65GApvwPgoFyqXMMgx`, Right `asset_WGjz5ACoCjryRVxYqbFLUwFh`. Left/right are distinct three-quarter side views, **not strict 90° orthographic**.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_qvjY6P91tydFgFv5ob8qx5Bg`](https://app.scenario.com/create?restartGeneration=job_qvjY6P91tydFgFv5ob8qx5Bg) produced [3D asset `asset_y2kpW68gPiYkmmmwGpUkrZtg`](https://app.scenario.com/assets?openAssetId=asset_y2kpW68gPiYkmmmwGpUkrZtg), seed `1217553280`. Texture/PBR/Delight on; Auto Size/Quad off; Standard quality, Original Image alignment, default version/orientation and blank face limit/seeds.
- Original GLB master: `cross-tribe/valkyra/rider/model/valkyra-rider-tripo-p2-v1.glb` outside Git, 3,377,620 bytes, SHA-256 `02f42898ecb4a2a3f3f22240b0685a11f6ad09592b61b22236b2d10abd776de0`. Archived from the exact asset viewer’s signed `model/gltf-binary` resource with verified content type, byte length, glTF header and read-only audit. `/manus-storage/valkyra-rider-tripo-p2-v1_16fb5bf0.glb` returned HTTP 307 locally and publicly; no binary media was committed to Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,791 | Informational |
| Triangles | 4,937 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,377,620 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. Bounds approximately 0.55×1×0.47; no mesh or texture editing was performed.

## Actual visual review and isolation

- [Query-gated Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=6#valkyra-rider-comparison): `cross-tribe/valkyra/rider/review/valkyra-rider-procedural-vs-p2.png` contains **24 actual rendered portraits**: full-size procedural/P2, 40px color and grayscale, eight rotations and occupied hexes. The P2 model retains a spear, tall crest, curled horns, mounted silhouette and cracked base, but is **considerably darker, lower contrast and smaller** than the bright procedural Rider. The blue lightning pennant does not read at 40px or grayscale; the mount/crest remain discernible but class recognition is not yet an aesthetic approval. Its stone base is rounder and bulkier than the target fractured hex.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,6,highlands&p2-candidate=valkyra-rider): actual Babylon scene with imported preview node `u1` and Rider at `(10,7)` next to a Valkyra capital, procedural hero and snow-covered mountain hexes. The top bar identifies Valkyra. Premium tribe index 6 is intentionally injected into **roster slot 0**, so `humanTribe: 0` is not an Auren mismatch; the checked displayed tribe name is Valkyra. Screenshot: `cross-tribe/valkyra/rider/review/valkyra-rider-live-board.png`. The spear tip reads, but the ram and pennant are dark against gray-green terrain, especially compared with the nearby procedural character. Scenario’s WebGL viewer screenshot was unreliable, so this judgment is based on real Babylon rendering, not a claimed Scenario canvas capture.
- An unflagged Valkyra game at the same seed retained one canonical hero, **zero imported GLB requests, zero imported preview nodes and zero page errors**. These are first-pass risks for later owner judgment, not a reason to interrupt breadth-first coverage for global aesthetic refinement.

## Validation

- Original GLB integrity/mobile audit, local/public 307 storage redirects, `pnpm check`, **36 focused imported-model guardrail tests**, 24 genuine Babylon Model Lab portraits, verified Valkyra board identity, and unflagged-game negative control passed. The full **284-test / 35-file** suite and bounded-memory production build passed; `git diff --check` passed. Vite warned that some existing production chunks exceed 500 kB. Technical integration does not imply owner aesthetic approval.
