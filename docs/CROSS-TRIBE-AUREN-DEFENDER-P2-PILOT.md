# Auren Defender — Scenario P2 first-pass study

**Decision: review candidate, not an approved visual target or normal-gameplay replacement.** The owner chose to complete a first pass across all remaining tribes, then evaluate and tweak the lineup as a whole.

## Provenance and reproducibility

- Six-role Auren concept sheet: [`asset_RCsqLmFC8unqSYLQQpaD2zuN`](https://app.scenario.com/assets?openAssetId=asset_RCsqLmFC8unqSYLQQpaD2zuN). Isolated Defender with oversized codex shield, short page crest, axe and blue rune base.
- Controlled four-view turnaround: [`asset_KKFPeN8wsT8vKyLZn5Z7SQJC`](https://app.scenario.com/assets?openAssetId=asset_KKFPeN8wsT8vKyLZn5Z7SQJC), Sunburst 3840×2160 PNG, visually checked front/left/back/right. Normalized four views at 1024×1024 each, preserving the full shield and base.
- Tripo P2 Multi View source assets: Front `asset_EQaAhNndKMtk3dVnmXCXPjMS`; Left `asset_jp8G9ynihWSKSioXpWKwHQzz`; Back `asset_phpqSYcPUKh4i4hg8Z2788wD`; Right `asset_jcmfexiy2njZF9b2Tc4dE7ts`. Texture, Delight and PBR on; Quality Standard, Alignment Original Image, Orientation default, Version default, Face Limit blank, Auto Size and Quad off. **One** generation was submitted.
- 3D model [`asset_rzu3ZxDAeW6MZ6CDm4KBKMyN`](https://app.scenario.com/assets?openAssetId=asset_rzu3ZxDAeW6MZ6CDm4KBKMyN), job `job_FkMBLgodBQpns9q8mP6brekT`, seed `1102222788`. Deployment-safe GLB `/manus-storage/auren-defender-tripo-p2-v1_7a2eaa5e.glb`; SHA-256 `0b7b00548010a49c14f5965a8da8dcb64c59b613f4813c94103aacb0267e27ef`. Original PNGs, GLB and audit JSON live outside the repository at `/home/ubuntu/sunder-art-pipeline/cross-tribe/auren/defender/`.

## Audited budget

| Measure | Result | Review limit |
|---|---:|---:|
| Vertices | 6,791 | Informational |
| Triangles | 4,553 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| GLB bytes | 3,463,632 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Maximum embedded texture | 2048×2048 | ≤2048×2048 |

## Review routes

- Model Lab: `/model-lab?tribe=0#auren-defender-comparison` compares procedural and imported portraits, 40px color and grayscale, eight rotations, and occupied-hex samples.
- Opt-in real Babylon board: `/?devgame=6104,11,0,highlands&p2-candidate=auren-defender`. The development-only route converts the local starter to Defender and moves it to a vacant adjacent grass hex if available. Normal gameplay still uses procedural units; there is no production switch.
- Review the codex-shield silhouette in grayscale and under forest/city contrast alongside the complete Auren lineup. No art approval or tweaks yet.

## Browser evidence and first-pass notes

- Model Lab rendered 24 authentic procedural/P2 portraits (full-size and 40px color/grayscale, eight rotations each, occupied-hex samples). Imported Defender retains a shield and blue circular sigil, but that mark is less prominent than the white procedural shield icon. Armor reads muted gray/navy rather than bright faction blue at 40px. Carry these as **lineup-level tuning observations**, not changes to make before the other tribes are complete.
- The real Babylon board loaded the imported GLB on a review-only Defender `u1` at `(10,7)` beside Auren's capital on seed `6104`; preview metadata was present and the browser reported no page errors. Normal matches remain procedural.
- TypeScript and focused registry tests passed; the storage proxy returned a signed redirect to the exact Defender GLB.
- The **full regression suite passed: 262 tests across 35 files**, and the production build succeeded. Technical acceptance is separate from owner approval of the visual direction.
