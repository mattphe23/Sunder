# Valkyra Warrior — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; neither approved nor default gameplay.** The owner's breadth-first direction remains in effect: compare every other tribe before subjective aesthetic revisions.

## Provenance

- Source: the [Valkyra six-role concept lineup](https://app.scenario.com/assets?openAssetId=asset_RcQzRKQsqrVQDtkRJV5PJoMz), isolated Warrior reference `asset_nuLF6Bbwb5gLLSAegYKTmVRA`. The original crop and locked prompt live outside Git under `cross-tribe/valkyra/warrior/`; the submitted prompt (excluding its trailing newline) matched SHA-256 `5502761e466da9ecfa1d12f3772dde263ae4a35263b0849a4114e143dc873bc0`.
- One Sunburst 3840×2160 turnaround, job `job_RMuyUFzotkBqP8U1tfYELrad`, yielded [asset `asset_9cSDjTMB8h7XAkAXGdXL8FrE`](https://app.scenario.com/assets?openAssetId=asset_9cSDjTMB8h7XAkAXGdXL8FrE). One source/image; Quality and Background Auto; displayed 18 CU. The archived native PNG is `valkyra/warrior/valkyra-warrior-turnaround-v1.png` (7,528,047 bytes; SHA-256 `c912fba81bb3cebd9c87bc92ebb27dbd8bc624fa65985aabaa1487478acc6fad`). The front, left, back and right views were each inspected and normalized to separate 1024² inputs. The generated cleaver is larger/uprighter than the brief; retain as a first-pass observation.
- Distinct P2 input IDs: front `asset_RLx4aZX2Kmm2YSSNWEFGii9M`, left `asset_2aXWMRQFvXMrwgHMvZLK3m5G`, back `asset_c7F3KJvg5ahoaKkod6i6cW2w`, right `asset_YkMFs7GNAw27s15v5zRa5TMy`. Exactly one Tripo P2 Multi View job `job_G5SsodH5456FmssYob4DkyKU` produced [3D asset `asset_FWzXYDdh2CP2CN4zBJo7UmJe`](https://app.scenario.com/assets?openAssetId=asset_FWzXYDdh2CP2CN4zBJo7UmJe), seed `728187324`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, face limit blank; 220 CU.
- The native GLB master is outside Git at `cross-tribe/valkyra/warrior/model/valkyra-warrior-tripo-p2-v1.glb`, SHA-256 `6fd2f9e790c4a9c4c6badf3ce10dbf707bcb5fe378dc8269772ef2d6d31d9462`. Runtime storage URL `/manus-storage/valkyra-warrior-tripo-p2-v1_051262b9.glb`; never place this binary in `client/public` or Git.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 3,652 | Informational |
| Triangles | 4,612 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,039,560 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass; complete audit JSON is archived beside the GLB. The Scenario viewer reported the same vertex and triangle counts.

## Visual review and routes

- [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=6#valkyra-warrior-comparison): `cross-tribe/valkyra/warrior/review/valkyra-warrior-procedural-vs-p2.png` contains the real procedural and imported portraits, color/grayscale at 40px, eight rotations apiece and approximate occupied-hex scale.
- [Query-gated development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,6,highlands&p2-candidate=valkyra-warrior): the actual opening Valkyra Warrior `u1` at `(10,7)` is rendered by Babylon as the one `p2CrossTribePreview` node, without page errors. Evidence `cross-tribe/valkyra/warrior/review/valkyra-warrior-live-board.png`; no normal-game starter code changed.
- **Strength:** segmented iron, pointed crest, offset buckler and fissured plinth form a consistent 3D silhouette, visibly distinct from nearby procedural units in the board capture. **Risk:** the intended sky-blue `#38bdf8` cue is confined mostly to the base fissure; the dark gray armor and upright slender blade lose the broad, forward cleaver silhouette and fade at 40px, especially in grayscale. Record this for the later whole-roster refinement pass; do not silently recolor or approve.

## Validation

- The Model Lab rendered **24 actual portraits**. The opted-in Babylon board loaded one authentic Warrior preview and reported zero page errors. The WebDev GLB proxy returned HTTP 307 to a signed storage URL.
- `pnpm check` and **20 focused imported-model tests** passed. A normal unflagged Valkyra devgame loaded the correct human tribe and canonical hero, **zero imported GLB requests**, **zero review-preview nodes**, and zero page errors.
- The full Sunder suite passed **268 tests in 35 files**. The Vite production build and bundled server both completed successfully; `git diff --check` is checked before publication.
