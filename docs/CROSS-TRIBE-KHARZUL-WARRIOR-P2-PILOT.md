# Kharzul Warrior — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** Complete every non-Nerivane tribe’s first pass before revising aesthetics.

## Provenance and technical right-view repair

- [Kharzul's six-role concept lineup](https://app.scenario.com/assets?openAssetId=asset_NU5cFPM66SLYEd9SRoKpFDkc) supplied a genuine isolated Warrior reference `asset_MByYpbHjhS2Vo8i6S2ARj7wS`. The locked four-view prompt is archived outside Git at `cross-tribe/kharzul/warrior/kharzul-warrior-turnaround-prompt.txt` (SHA-256 without the POSIX trailing newline `b1222ecd1527c565f5e0a85ab80516058b268319dd4cd623ff3f8e9a5c92ef66`). One 3840×2160 Sunburst job [`job_4rCQWH4XCkNhPR77ueNmF8Nt`](https://app.scenario.com/create?restartGeneration=job_4rCQWH4XCkNhPR77ueNmF8Nt) produced [`asset_LbfFcb71gefToHf1mth93fTb`](https://app.scenario.com/assets?openAssetId=asset_LbfFcb71gefToHf1mth93fTb), PNG SHA-256 `7dc593dfd5774a3c6dfcad05d4c6718e8b8bfdc3d36264b3f5939762d5d14a64`.
- The sheet's fourth panel was front/three-quarter rather than a true **right profile**. It was preserved as rejected evidence, not passed off as a valid Tripo view. A three-valid-view repair reference `asset_B9zwwz7LXdUWerkjRWCcLCAd` and narrow orthographic-only prompt (SHA-256 `bee1257b44a32f5be5d389a5e546dccd8b0b62a16650e533dfa01dca14acdb7b`) yielded one 1024×1024 Sunburst job [`job_ofuYLbM9oMdXunq1iYju9grP`](https://app.scenario.com/create?restartGeneration=job_ofuYLbM9oMdXunq1iYju9grP) and a visually inspected true opposite-side [right profile `asset_b7EioZmA6mDenyr4sAFbCoF8`](https://app.scenario.com/assets?openAssetId=asset_b7EioZmA6mDenyr4sAFbCoF8), SHA-256 `2ea18e0427ec6c771bf39bd2e8e1e7165b4a34d2d78dd69d13007a90959ae9fd`. Front/left/back came from the original sheet; right came only from the separately repaired image. All four 1024² PNGs and both original masters are archived outside Git.
- P2 source IDs in order: front `asset_CZGXjnHzsTEcc9D4Rt6LUejg`, left `asset_5tEPYDN6BPkFFEULD7Gadbez`, back `asset_TzbyeCbQAH4G49j6KBqxmPq3`, repaired right `asset_ot3Em4fP7D4VppF1u4C1VdJ6`. One [Tripo P2 job `job_R4o7XYgDXMgoyhnK771F2ZgG`](https://app.scenario.com/create?restartGeneration=job_R4o7XYgDXMgoyhnK771F2ZgG) produced [asset `asset_dbYL3ACetv23YrHQ8NProoWX`](https://app.scenario.com/assets?openAssetId=asset_dbYL3ACetv23YrHQ8NProoWX). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit and seed, displayed 220 CU.
- Native GLB master: `cross-tribe/kharzul/warrior/model/kharzul-warrior-tripo-p2-v1.glb` outside Git; SHA-256 `b5ca61d9cd659f7a5c23066cb0ca0c0d42a61c92e9cd35340e95a038eb00000f`. Runtime path `/manus-storage/kharzul-warrior-tripo-p2-v1_0dfbcc82.glb`. Never commit the GLB to `client/public`.

## Read-only GLB budget audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 6,526 | Informational |
| Triangles | 4,411 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,368,484 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The original JSON audit is archived beside the GLB.

## Opt-in visual review

- Development [Model Lab comparison](../client/src/pages/ModelLab.tsx): `/model-lab?tribe=1#kharzul-warrior-comparison`. The actual evidence `cross-tribe/kharzul/warrior/review/kharzul-warrior-procedural-vs-p2.png` contains procedural and P2 full portraits, 40px color/grayscale, eight rotations each and occupied-hex scale.
- Query-gated Babylon board route: `/?devgame=6105,11,1,highlands&p2-candidate=kharzul-warrior`. The genuine opening Kharzul Warrior `u3` sits on a **naturally available adjacent grass tile `(2,9)`**, unobstructed by capital geometry. Seed `6104` left its starter beneath a city because nearby grass was occupied by the authentic hero; selecting `6105` required **no code or gameplay placement change**. The actual capture is `cross-tribe/kharzul/warrior/review/kharzul-warrior-live-board.png`; ordinary gameplay remains procedural.
- The imported angular mask, tall red crest, shield and large cleaver give it a distinguishable combat silhouette at portrait scale and across rotations. **First-pass risk:** at 40px its dark charcoal/low-saturation armor and narrow red areas read much smaller and dimmer than the procedural icon; grayscale loses some role detail. The repaired fourth view and resulting mesh still favor an **upright** cleaver instead of the intended low rectangular weapon. The grass hex is visible, but nearby mountains could reduce contrast in a different map view. Defer any artistic correction until all tribes have first-pass coverage.

## Validation

- The Model Lab rendered 24 authentic images. Babylon loaded an imported preview node for the genuine Kharzul opening Warrior `u3` at `(2,9)` with no browser page errors. The WebDev storage proxy returned HTTP 307 to its signed GLB.
- `pnpm check` and **23 focused registry tests** passed. The full Sunder suite passed **271 tests in 35 files**, the final Vite/server production build passed, and `git diff --check` found no whitespace errors.
- On an ordinary unflagged Kharzul board `/?devgame=6105,11,1,highlands`, the canonical Kharzul hero remains present with **zero imported GLB requests, zero P2 preview nodes and zero page errors**.
