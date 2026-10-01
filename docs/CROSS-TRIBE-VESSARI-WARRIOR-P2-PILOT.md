# Vessari Warrior — Scenario P2 first-pass review candidate

**Decision: `review-candidate`, not approved and not default gameplay.** This is a breadth-first study of one of the remaining tribes. No normal gameplay model was replaced; aesthetic adjustments wait for the complete other-tribe first pass.

## Provenance

- The six-role [Vessari concept lineup](https://app.scenario.com/assets?openAssetId=asset_vdurdQ5jKgW9qjk9vFaQGtNL) supplied the isolated Warrior reference `asset_yK3Pk6joaAmg87mHcsVumwTa`. The genuine source crop and locked prompt are archived outside Git under `cross-tribe/vessari/`. The submitted prompt matched the archived text (without its trailing POSIX newline), SHA-256 `af8ea9d8dacff64c4e76f013de724d0400d1b7e45e6137bc6a0a3daa74335d65`.
- A single GPT Image 2.5 Sunburst 3840×2160 orthographic turnaround, job `job_7FjUVaoDocsTotre5cJebjwu`, produced [asset `asset_9HHD3GPDD4n3kZq2yzr7t7b7`](https://app.scenario.com/assets?openAssetId=asset_9HHD3GPDD4n3kZq2yzr7t7b7). One source, one output, Quality Auto, Background Auto, displayed 18 CU. Original PNG SHA-256 `588be01a471e013399e980e756c72124b9839b15a06cf1c2ff2fff117f1e4147`; its actual front, left, back and right were inspected and normalized to four 1024² inputs without stretching.
- Distinct Tripo P2 input assets: front `asset_bNwQBvR9BbpgKWu3pdRAXaGt`, left `asset_FpSKVkBEXPw9miDXE6dc91Ju`, back `asset_5hn1eVfFoWoZijZ9aGFpm9xC`, right `asset_NRAc5HFUZY4bTV8hhuNHBtJb`. One job `job_6PUwtQeGpQu7NtAGfKPBpKRw` produced [3D asset `asset_bWQmtZAKzZQNpGRuDv72oTka`](https://app.scenario.com/assets?openAssetId=asset_bWQmtZAKzZQNpGRuDv72oTka), seed `1180228116`. Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default version/orientation, face limit and requested seed blank; displayed 220 CU. An inadvertent Quad toggle briefly displayed 230 CU, but was corrected **before** the guarded 220-CU generation. No 230-CU job was submitted.
- Native GLB master remains outside Git at `cross-tribe/vessari/warrior/model/vessari-warrior-tripo-p2-v1.glb`, SHA-256 `b840063159f8d276f2bab4bb56f188cbaacf7bda1092dd7da1dba719d5745824`. Runtime storage path `/manus-storage/vessari-warrior-tripo-p2-v1_88434b73.glb`; do not place binary media in `client/public` or the repository.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,376 | Informational |
| Triangles | 5,176 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,035,204 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All budget gates pass. Scenario’s viewer reported 7,374 vertices, whereas the registry uses the audited glTF accessor count of 7,376. The complete binary audit JSON is archived beside the original GLB.

## Actual visual comparison and review routes

- Development Model Lab: `/model-lab?tribe=3#vessari-warrior-comparison`. Archived evidence `cross-tribe/vessari/warrior/review/vessari-warrior-procedural-vs-p2.png` shows the real procedural and imported portraits, 40px color and grayscale, eight angles apiece and approximate occupied-hex scale.
- Query-gated development board: `/?devgame=6104,11,3,highlands&p2-candidate=vessari-warrior`. It uses the **authentic** Vessari opening Warrior `u7`, placed at clear adjacent grass `(6,2)` only on this review route; Babylon loaded the imported node with `p2CrossTribePreview`. `cross-tribe/vessari/warrior/review/vessari-warrior-live-board.png` is the actual-game screenshot. The development-only starter placement now tests multiple adjacent grass hexes rather than leaving a candidate buried in city geometry when the east hex is forest. Ordinary starts and the hero remain unchanged.
- The imported blade and small buckler form a coherent asymmetric Warrior silhouette, and its pointed helmet/cloth shape survive rotations. **Risk:** the purple/violet identity is faint in the P2 render; armor, face and base read mostly cool gray. At 40px, the imported unit is smaller, darker and much less legible than the brighter procedural icon. Against nearby gray mountain tiles it can blend into the terrain; preserve this as a cross-tribe refinement finding rather than a unilateral artistic tweak.

## Validation

- The Model Lab rendered 24 real portraits; the Babylon board loaded the authentic Warrior `u7` at `(6,2)` without page errors. The WebDev storage proxy returned HTTP 307 to the signed GLB.
- `pnpm check` and **19 focused imported-model guardrail tests** passed after the review-only placement change. `git diff --check` passed.
- A normal, unflagged Vessari game `/?devgame=6104,11,3,highlands` loaded Vessari as the human tribe with one canonical hero, **zero imported GLB requests**, **zero P2 preview nodes** and **zero page errors**.
- The full Sunder suite passed **267 tests in 35 files** again after the placement edit. The final post-placement production build also passed (`vite build` and bundled server); this pilot is ready for collaborator-safe GitHub publication and a matching checkpoint.
