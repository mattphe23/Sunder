# Auren Rider — Scenario P2 first-pass study

**Decision: review candidate, not an approved visual target or normal-gameplay replacement.** Complete the other tribes before lineup-wide revisions, per the owner's direction.

## Provenance

- [Auren concept lineup](https://app.scenario.com/assets?openAssetId=asset_RCsqLmFC8unqSYLQQpaD2zuN): isolated the cliff-goat Rider, spear/pennant, Auren-blue armor, and fractured hex base; removed only a neighboring sprite fragment from the individual reference.
- [Controlled four-view turnaround](https://app.scenario.com/assets?openAssetId=asset_nkB54EWY5RQwJqq5oZKAontb): one GPT Image 2.5 Sunburst job `job_XbwxdgiGecGRmE1bBRP6Do4g`, 3840×2160 PNG. Normalized front/left/back/right at 1024×1024 each; source master and views are archived outside Git at `/home/ubuntu/sunder-art-pipeline/cross-tribe/auren/rider/`.
- Tripo P2 Multi View input assets: Front `asset_kBNkmtoC7pMiEAHSNTJexC3s`, Left `asset_qXdARhaQFpNqjrgQ6fBcjm66`, Back `asset_bkPfX6y5DXsP5QUv6cz6RijR`, Right `asset_GioK6TWGAvSUc76BtgswX2Cc`. Texture/Delight/PBR on; Quality Standard, Alignment Original Image, Orientation/Version default, Auto Size/Quad off. One generation, `job_5yFvEvciKLWdid36NKw8z7Eb`.
- [Tripo P2 output](https://app.scenario.com/assets?openAssetId=asset_r2PMcxBsrzmPB96StyVZ6BoC), seed `1844924913`; deployment-safe GLB `/manus-storage/auren-rider-tripo-p2-v1_127d9a50.glb`; SHA-256 `dd5e4c778da10a0d82927c0fd9f649e501240501abc2acfe493be0aceb4eca66`. The original GLB and JSON audit are archived under `auren/rider/model/` outside the repository.

## Audited model budget

| Measure | Result | Review limit |
|---|---:|---:|
| Vertices | 7,311 | Informational |
| Triangles | 4,880 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| GLB bytes | 3,543,656 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Maximum embedded texture | 2048×2048 | ≤2048×2048 |

## Review routes and decision boundary

- Model Lab: `/model-lab?tribe=0#auren-rider-comparison` — procedural and imported full portraits, 40px color/grayscale, eight rotations, and occupied-hex comparison.
- Opt-in real Babylon board: `/?devgame=6104,11,0,highlands&p2-candidate=auren-rider`; the deterministic starter is converted to Rider for this development-only query. The default game does not load Rider's GLB.
- Evaluate the cliff-goat silhouette, flag, blue palette, and footprint against the other Auren roles at board size. Record issues for the full-lineup pass, not isolated approval or premature tuning.

## Validation

- Model Lab produced 24 real procedural/P2 portraits in the direct side-by-side, including full-size, 40px color/grayscale, eight rotations, and occupied-hex scale. The compact goat and pennant are present; the imported figure looks much darker and smaller than the white/blue procedural Rider at 40px. Record this as a first-pass contrast/scale observation, not a request to revise Rider before the other tribes.
- A real development match on seed `6104` loaded the imported Rider mesh on unit `u1` at `(10,7)` beside the capital. The goat remains legible against grass but its blue identification marks and dark armor recede beside the bright procedural hero and city. Browser reported no page errors; ordinary gameplay is not changed.
- Negative control: the same Auren `?devgame=6104,11,0,highlands` route **without** `p2-candidate` issued zero GLB requests and created zero imported-preview nodes.
- TypeScript, the 15 focused registry tests, and the GLB storage proxy (signed redirect) passed. The complete regression suite passed **263 tests across 35 files**, and the production Vite/Express build succeeded. Technical acceptance is separate from owner approval of the artistic direction.
