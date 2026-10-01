# Auren Warrior — first cross-tribe Scenario P2 pilot

**Decision: first-pass review candidate, not an approved visual target.** This model is deliberately absent from ordinary gameplay. Owner direction is to review all remaining tribes before making cross-tribe art tweaks; this one-unit pilot validates that the approved Nerivane pipeline transfers to Auren.

## Source and reproducibility

- Auren six-role sheet: Scenario asset [`asset_RCsqLmFC8unqSYLQQpaD2zuN`](https://app.scenario.com/assets?openAssetId=asset_RCsqLmFC8unqSYLQQpaD2zuN), GPT Image 2.5 Sunburst, 3840×2160. Original artwork and isolated Warrior reference are preserved in the external art workspace.
- Controlled Auren Warrior four-view sheet: [`asset_MC9i8fuuauWsUPYGwMr878jS`](https://app.scenario.com/assets?openAssetId=asset_MC9i8fuuauWsUPYGwMr878jS), 3840×2160. Normalized front/left/back/right inputs are 1024×1024 each.
- Tripo P2 Multi View inputs: front `asset_YNcbKLkFMfCwduZEqWBhxbCo`; left `asset_drrn7oX27MpqQf62t1X8U3yA`; back `asset_H7wJgRW3kvEphy4soxZLYrSM`; right `asset_LEtDaqp7aBJXgoLwwg469GZj`.
- Model [`asset_wiR5LFhSSf5bEMUYttpSSPZt`](https://app.scenario.com/assets?openAssetId=asset_wiR5LFhSSf5bEMUYttpSSPZt), job `job_8Zfk47vFKuuF7zc1uG7dpWga`, seed `1008915895`. Texture, Delight, and PBR on; quality Standard, orientation Default, alignment Original Image, Auto Size and Quad off. One generation submitted; no alternate direction has been selected.
- GLB is stored outside Git and served from `/manus-storage/auren-warrior-tripo-p2-v1_75223405.glb`; SHA-256 `2217a5d5e49668685bc220d12c485ebcd9a47163bfb23f8f54b809d24355e0fb`.

## Import budget

| Measure | Audited result | Limit |
|---|---:|---:|
| Vertices | 6,301 | Informational |
| Triangles | 4,353 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| GLB bytes | 3,073,496 | ≤5,242,880 |
| Embedded image resolution | 2048×2048 | ≤2048×2048 |
| Material / embedded textures | 1 / 3 | Informational |

## Review gates

- Model Lab: `/model-lab?tribe=0#auren-warrior-comparison`. Inspect full-size procedural/P2 portraits, 40px color and grayscale, eight rotational views, and approximate occupied-hex tiles.
- Deterministic **development-only** actual-board preview: `/?devgame=6104,11,0,highlands&p2-auren-warrior=1`.
- The normal board route does not request the Auren GLB; all ordinary Auren Warriors remain procedural. On the devgame Auren review route only, the opening Warrior is displayed on an empty grass hex beside the city, if available, because the capital otherwise obscures the imported model. This does not modify unit rules, starter composition, production defaults, or any Nerivane approvals.
- Visual risks observed in the imported Model Lab rendering: the long sword dominates the 40px silhouette, and the dark model is smaller/less saturated than the procedural figure. Confirm game-board contrast, color-family consistency, and legibility against the full roster before approving or refining it.

## Verified browser checks

- Authentic Babylon Model Lab captured the procedural and imported Auren Warrior, 24 portrait images, eight rotations per model, 40px color/grayscale, and approximate hex context; no page errors.
- On `devgame=6104,11,0,highlands&p2-auren-warrior=1`, starter unit `u1` remains a Warrior and renders the 6,301-vertex GLB with `p2AurenWarriorPreview` metadata on clear grass (`x=10,y=7`); hero and city remain procedural. The first capture showed the city occluding the imported figure at `x=9,y=7`, which was corrected only for the devgame review route.
- Negative control on `devgame=6104,11,0,highlands` without the opt-in flag showed **zero** Auren GLB requests and **zero** imported preview nodes. The review asset is not in normal gameplay.
- Following the review-only placement refinement, TypeScript, the focused registry guardrail (11 tests), the full regression suite (259 tests in 35 files), and the production build all passed. The temporary public Model Lab URL also returned HTTP 200.

The local production record and source images are preserved outside the repository in the cross-tribe art workspace. No bulky model or PNG master is committed to Git.
