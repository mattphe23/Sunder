# Sunwei Sunwarden — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** The imported specialist model is available only through explicit development review routes. The default Sunwei Warden remains procedural. Other specialists and heroes, landscape cleanup, and TestFlight remain separate work.

## Provenance

- Untouched original `cross-tribe/sunwei/sunwei-sunwarden-source.png` outside Git: 1024×1024, 631,222 bytes, SHA-256 `08b4c4e99a88a80f81386311cf4a7a065b6f184f3bd871a47b006331a5d9e6df`. Its distinctive identity is an ivory mask, very tall gold/dark-umber block crest, ochre armor, olive/charcoal long robes, a planted staff carrying an overhead amber lantern with ring and key pieces, and a fractured gray hex with one gold fissure—not a mount. A reproducible background-only reference repair removed 27,708 disconnected fragment pixels: `sunwei-sunwarden-source-edge-repaired.png`, 606,557 bytes, SHA-256 `0d9df4522d675f67ca0dfec4b0bcbcfdcdd30c0de7b88122ff5b0f940793cc3a`; central staff/figure/base pixels x=271–691 remain bit-identical. Locked source-faithful prompt SHA-256 `cf77659c3957ad9bbcf3752a0baaa3e3195dba3a3328e027b9cf80870fd50209`.
- Exactly one 18-CU [Sunburst job `job_TJsZdHyWM1QEERav3iHXv6HJ`](https://app.scenario.com/create?restartGeneration=job_TJsZdHyWM1QEERav3iHXv6HJ) used sole durable repaired source `asset_mKjK2btesYgG5Z9ZqjTshprD`, the exact locked prompt, one 3840×2160 canvas and Auto quality/background. Its [image asset `asset_3ctBTvnKD6EWUfPKATfTaGZU`](https://app.scenario.com/assets?openAssetId=asset_3ctBTvnKD6EWUfPKATfTaGZU) was archived unchanged outside Git: 7,675,174 bytes, SHA-256 `1d1e11f34534db40af68b87eb9b6ab9265f794c4304577c631059f3adc695008`. Front/Left/Back/Right were visually distinct with staff, lantern, hanging keys, crest, robes and base. Initial equal-column crops were **rejected**: Front's base was clipped and Left included a neighboring base sliver. The measured blank first split x=1000 yielded four distinct 1024² unstretched corrected inputs, independently QA'd for complete bases and no sliver.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_Kv7LhWitZj2iLakY5PxypL9T`](https://app.scenario.com/create?restartGeneration=job_Kv7LhWitZj2iLakY5PxypL9T) produced [3D asset `asset_Bm98ibq6UYW9UMSsmwJznFgQ`](https://app.scenario.com/assets?openAssetId=asset_Bm98ibq6UYW9UMSsmwJznFgQ), seed `373797630`. The four independent durable corrected inputs were Front `asset_yrX4ptfYH6yMwsHN2HFBhWCF`, Left `asset_TaAKUH1aSKHJkxmJmGU2wL7H`, Back `asset_PenGSdzoUpxQELWgBrZ7N1At` and Right `asset_kT36ATuAEFbpnXevNffyBb39`. Texture/PBR/Delight on, Auto Size/Quad off, Standard, Original Image, default orientation/version, blank seed/face limit. No duplicate generation or 230-CU Quad run.
- Exact original binary archived outside Git at `cross-tribe/sunwei/sunwarden/model/sunwei-sunwarden-tripo-p2-v1.glb`: 3,852,780 bytes, SHA-256 `28ae7e793a2f108845c3253b22f4dc0c9000532c0ade3f01f7f9a85896376b52`. Signed exact-asset resource passed binary MIME, byte-length and glTF checks. Managed runtime path `/manus-storage/sunwei-sunwarden-tripo-p2-v1_53de92df.glb` returned HTTP 307 locally and publicly. No binary media was placed in Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,766 | Informational |
| Triangles | 5,008 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,852,780 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. No model retouching was performed. Rear geometry is a generated source-faithful continuation, not a documented original back view.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=2#sunwei-sunwarden-comparison): `cross-tribe/sunwei/sunwarden/review/sunwei-sunwarden-procedural-vs-p2.png` contains **24 real Babylon-rendered portraits**: full-size procedural/P2, 40px color/grayscale, eight rotations and occupied hexes. The imported model preserves the source's tall sunward crest, lantern/staff, long robes and gold fissure, making a distinctive sentinel. It is **considerably smaller and more muted gray/ochre** than the stock bright-yellow, blocky, hammer-bearing Warden; the lantern and keys become very fine at 40px and in grayscale. This role-equipment divergence and size contrast remain future aesthetic review risks, not an owner-approved replacement.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,2,highlands&p2-candidate=sunwei-sunwarden): actual Sunwei game (tribe 2), Warden preview node `u5` at `(2,1)`, procedural hero retained, zero page errors. The authentic screenshot `cross-tribe/sunwei/sunwarden/review/sunwei-sunwarden-live-board.png` shows the lantern-bearing figure on a grass tile next to a city, with a larger yellow procedural hero and gray highlands for honest scale/terrain comparison. The slender crest reads more clearly than the tiny lantern/keys at board scale.
- An **unflagged** Sunwei game at the same seed retained **one canonical hero, zero imported candidate GLB requests, zero preview nodes and zero page errors**. The GLB is query-gated/opt-in only.

## Validation

- Original/reference/crop QA, exact-asset GLB audit, managed-storage local/public HTTP 307, `pnpm check`, **43 focused registry tests**, authentic 24-portrait/board evidence, same-seed normal-game negative control, and `git diff --check` passed. The **full suite passed: 291 tests in 35 files**. The bounded-memory client/server production build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully with only large-chunk warnings. This first-pass technical integration implies no owner aesthetic approval and does not replace default gameplay.
