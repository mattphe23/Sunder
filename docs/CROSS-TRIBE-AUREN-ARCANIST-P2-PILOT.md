# Auren Arcanist — Scenario P2 first-pass study

**Decision: review-candidate.** This is a non-default imported visual for Auren’s canonical `arcanist` unit, not a rollout or a final art approval. Under the owner’s first-pass direction, finish all other tribes before making aesthetic tweaks.

## Provenance

- Source: isolated Auren Arcanist (staff and lens) from the [Auren lineup](https://app.scenario.com/assets?openAssetId=asset_RCsqLmFC8unqSYLQQpaD2zuN). This is distinct from hero Maelis.
- Scenario GPT Image 2.5 Sunburst four-view turnaround: [asset `asset_cUGzNFpgoEg9AVJsocNMjYNm`](https://app.scenario.com/assets?openAssetId=asset_cUGzNFpgoEg9AVJsocNMjYNm), one 3840×2160 PNG normalized to four 1024×1024 views. Generation job `job_8WMW58UEirCyBr5iEfmZqikB`.
- Scenario Tripo P2 Multi View: [asset `asset_58PE3HsUFbcBsPvT8sxrFuJh`](https://app.scenario.com/assets?openAssetId=asset_58PE3HsUFbcBsPvT8sxrFuJh), job `job_khPG8oqmmuzZjwgNi6idLz77`, seed `1805973394`. Front `asset_1b4tMwvi3Q9Sdiq61Y7QUsJX`, left `asset_FtirDV2QmLCgh8YaxA3JxDvZ`, back `asset_bB4g9Rzwwp6SgrXMrj3shvwU`, right `asset_9Fr7etxoq6VeT11jbC6wMEvY`.
- Verified Tripo settings: texture and PBR on; Delight on; Auto Size and Quad off; Standard quality, default version/orientation, original-image alignment, blank face limit. The earlier claimed submission reused Rider’s job ID and did not create an Arcanist asset; this was corrected before the distinct job above was submitted.
- Master GLB SHA-256 `7311038e50e37e4ebb276adb769ea54d55eea717e2facb28aa22b25504677240`; runtime URL `/manus-storage/auren-arcanist-tripo-p2-v1_bccc218f.glb`. Master and detailed ledger remain outside Git in `/home/ubuntu/sunder-art-pipeline/cross-tribe/auren/arcanist/`.

## Technical budget

| Measure | GLB result | Pilot limit |
|---|---:|---:|
| Vertices | 6,767 | measured |
| Triangles | 4,686 | 10,000 |
| Runtime primitives | 1 | 8 |
| GLB bytes | 3,328,668 | 5,242,880 |
| Embedded textures | Three, 2048² | 2048² |

## Visual acceptance routes

- Model Lab: `/model-lab?tribe=0` — procedural Arcanist versus P2 portrait, 40px color/grayscale, rotations, occupied-hex scale.
- Development-only board: `/?devgame=6104,11,0,highlands&p2-candidate=auren-arcanist` — the same local opening Warrior is converted solely in this opt-in review route and moved beside its city when an empty adjacent grass tile exists.
- Default games do **not** request this GLB. The owner will decide aesthetic refinements after the full seven-tribe first pass.

## Verification

- Model Lab rendered 24 authentic portrait images. The P2 staff ring, tall crest, codex and fractured base read distinctly at full size and across the eight rotations, but its navy/gray robe and small blue highlights lose contrast beside the bright procedural silhouette at ~40px and on a forest-edge tile. This is a recorded risk for **later cross-tribe tuning**, not a revision now.
- The `p2-candidate=auren-arcanist` Babylon board loaded imported review node `u1` with the local Arcanist at `(10,7)` on development seed 6104; the browser reported no page errors. The default development match on the same seed requested **zero** Arcanist GLBs and had **zero** P2 preview nodes.
- TypeScript, all 16 focused registry tests, the full 264-test suite (35 files), and the production build passed. The GLB storage proxy served a valid signed redirect to the uploaded model.
