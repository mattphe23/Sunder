# Kharzul Rider — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** This completes only the first-pass ordinary Rider wave after the actual Babylon review and validation gates succeed. Other specialist/hero characters remain pending; landscape cleanup and iOS/TestFlight are separate work. Procedural Kharzul remains the default.

## Provenance

- Original Kharzul Rider source outside Git: `cross-tribe/kharzul/kharzul-rider-source.png`, 1024×1024, 629,358 bytes, SHA-256 `5cdf2d68c0d462bb24f6040658ec016f460ba251224d71aba2a901f145bced99`, unchanged. It depicts a short-red-crest rider on a stocky black tusked boar, with a hooked upright glaive and red ribbon, leather harness, saddle cloth and fractured stone hex with an orange fissure. The detached right-edge neighboring shard was removed only in a reproducible reference copy: `kharzul-rider-source-edge-repaired.png`, 623,978 bytes, SHA-256 `62543bacab6ad3ab47b383fd6759ce43178ae6614ab6f38f28797f86eb41370d`; 9,745 background pixels changed with the subject region bit-identical. The source-mismatched earlier brief was archived and **not submitted**. Locked source-faithful prompt SHA-256 `8b60ce5a767b18c1fada8e0b46991aa5dabfcdc545d52ab65dcc5d75ca086726`.
- Exactly one 18-CU [Sunburst job `job_BnqXqKtRRaLDKySuA9ARpDMw`](https://app.scenario.com/create?restartGeneration=job_BnqXqKtRRaLDKySuA9ARpDMw) used repaired source `asset_7Lh12McYP2AMn7NbnQoG5SyA`, one 3840×2160 output, Auto quality/background and produced [asset `asset_b8mXzHEA9mvs65FAGVDncP1v`](https://app.scenario.com/assets?openAssetId=asset_b8mXzHEA9mvs65FAGVDncP1v). Immutable native image outside Git is 7,844,817 bytes, SHA-256 `c1e127e91c71e8476bb8ea8768e34f064c3061b60f05f85b1ad0980bc193ba94`. The four independent unstretched 1024² Front/Left/Back/Right crops were QA'd for full mount, tusks, weapon and base. The derived Back crop alone had 111 neighboring-column background seam pixels replaced deterministically; its character/base region remained bit-identical.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_HBG51TDeRcWEStJx1iVf6Ehy`](https://app.scenario.com/create?restartGeneration=job_HBG51TDeRcWEStJx1iVf6Ehy) produced [3D asset `asset_hru9LsudGhfU6FJk2ZzU2koe`](https://app.scenario.com/assets?openAssetId=asset_hru9LsudGhfU6FJk2ZzU2koe), seed `2035186574`. Independent durable inputs: Front `asset_5oyz7mpJ45WfVdyyyuu5BZp1`, Left `asset_cdQ4aSoZZhvsSoCwnPp6tQGS`, Back `asset_g4JiaD4pKY1uQfU5jZJfxkTK`, Right `asset_BwrL5o9CNxSwmJ8L4iYXYMj3`. Texture/PBR/Delight on; Auto Size/Quad off; Standard quality, Original Image alignment, default orientation/version and blank seed/face limit. No duplicate job or 230-CU Quad run.
- Exact original GLB archived outside Git at `cross-tribe/kharzul/rider/model/kharzul-rider-tripo-p2-v1.glb`, 3,616,972 bytes, SHA-256 `67baeeddc23e0f49447f6f15a834f462c0fb35474b43569722563cf31201bf71`. The signed original Scenario URL returned `model/gltf-binary` with the expected asset ID, byte length and glTF header; an initial network read timed out before writing any file, then a retry archived the same asset. Managed runtime path `/manus-storage/kharzul-rider-tripo-p2-v1_2b25fb34.glb` returned HTTP 307 in local and public previews. No binary media was put in Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,327 | Informational |
| Triangles | 4,889 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,616,972 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. No mesh or texture retouching was performed.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=1#kharzul-rider-comparison): `cross-tribe/kharzul/rider/review/kharzul-rider-procedural-vs-p2.png` contains **24 authentic Babylon-rendered portraits**—full-size procedural/P2, 40px color/grayscale, eight rotations and occupied hexes. The new model retains the tusked boar, short crimson crest, upright hooked weapon and fissured base across the views. Compared with the red blocky procedural mount, it is significantly more anatomical but smaller and much less red-saturated. The rider/weapon remain discernible in isolation; in grayscale and at 40px the crest, ribbon and team identity are weak. Its dark mount and more upright block-like stone plinth are first-pass risks for later review, not owner approval.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6105,11,1,highlands&p2-candidate=kharzul-rider): actual Kharzul game (tribe index 1), preview node `u3` at `(2,9)`, procedural hero retained, and no page errors, captured in `cross-tribe/kharzul/rider/review/kharzul-rider-live-board.png`. The board displays the boar and rider on an unobstructed tile next to a city, confirming live 3D context; the nearby procedural hero and red boundary make its desaturated appearance especially apparent. An initial same-unit seed 6104 capture put the model behind city geometry, so the clearer seed 6105 screenshot is the recorded board evidence.
- An **unflagged** Kharzul game at the same seed retained one canonical hero and loaded **zero candidate GLB requests, zero preview nodes and zero page errors**. Imported 3D media is strictly opt-in/query-gated.

## Validation

- Original and crop QA, exact GLB audit, storage redirect, `pnpm check`, **41 focused imported-model tests**, 24 Babylon portraits, actual board identity, unflagged negative control and `git diff --check` passed. The **full suite passed: 289 tests in 35 files**. The bounded-memory client/server production build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully with only large-chunk warnings. This first-pass integration does not imply owner aesthetic approval or default replacement.
