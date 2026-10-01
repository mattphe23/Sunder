# Dravok Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** The owner requested breadth-first completion of the non-Nerivane roster before subjective visual refinement. This imported asset is reachable only through explicit development review routes.

## Provenance

- The Dravok concept lineup supplied an isolated 1024² Archer source; a disconnected neighboring fragment on its far-right margin was a technical reference defect. `cross-tribe/repair-archer-edge-fragments.py` transplanted only AI-cleaned studio background into that margin; central character, bow, quiver and base pixels remain exact originals. The actual submitted `dravok-archer-source-edge-repaired.png` has SHA-256 `f1e17711591919ae37a50bbd009e6ffefa723d3b67dc9bad9108ebf733b4225d` and was uploaded as Scenario `asset_Giaczvctz5RNHq3QewphiAzt`. Original crop, AI background intermediate and repair script are archived outside Git.
- The submitted prompt matched the locked text without its trailing newline: SHA-256 `6479692c767286633a96562abc28e4559555f3cd4e8ff509491ee04224de3aaf`. One [Sunburst job `job_ASdm5kJK9ScEsxa2WzmP3ova`](https://app.scenario.com/create?restartGeneration=job_ASdm5kJK9ScEsxa2WzmP3ova) produced [turnaround asset `asset_RNijwX8BU38Fyv768SxFVkjc`](https://app.scenario.com/assets?openAssetId=asset_RNijwX8BU38Fyv768SxFVkjc): one source, one image, physical 3840×2160, Quality/Background Auto, displayed 18 CU. Native PNG: 8,311,127 bytes, SHA-256 `a589f4fec3b2c880f2b222ff5d5a8173eb50a512ef5f51906dc0b01dfa4e0f27`. Distinct front, left, rear and opposite-right profiles were inspected, then normalized to four non-stretched 1024² inputs. **Source QA caveat:** Sunburst exaggerated the ordinary crest height; retain this as a review risk rather than secretly revising a candidate early.
- P2 assets in slot order: front `asset_gVvLQjj5JcU1fuC728pKCco9`, left `asset_cfHNKm6QufefHN9U4JGexbpi`, back `asset_w6gCb19wBYPCrnXhgPiLSdJs`, right `asset_prKDTRdWr2xbLD8PQd7VgrhF`. One 220-CU non-Quad [Tripo P2 job `job_dvLXt5wFEdVafkXzeL92Z9bc`](https://app.scenario.com/create?restartGeneration=job_dvLXt5wFEdVafkXzeL92Z9bc) produced [3D asset `asset_SGhUdcFdjyUUneqUaAdw6GwZ`](https://app.scenario.com/assets?openAssetId=asset_SGhUdcFdjyUUneqUaAdw6GwZ). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version and blank face limit.
- Native GLB master `cross-tribe/dravok/archer/model/dravok-archer-tripo-p2-v1.glb` is outside Git, SHA-256 `47b990aff4f86cbb14cee60c66bb793ddc6a55b0b1bf8bd9083ebda1c5f3639c`. WebDev runtime path `/manus-storage/dravok-archer-tripo-p2-v1_36b23044.glb` returns HTTP 307. No model binary belongs in `client/public` or Git.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,055 | Informational |
| Triangles | 4,841 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 2,861,332 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. These values come from the native GLB accessor audit retained as `model/audit.json` outside Git.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=5#dravok-archer-comparison): actual `cross-tribe/dravok/archer/review/dravok-archer-procedural-vs-p2.png` includes **24 rendered portraits**—full procedural/P2, 40px color/grayscale, eight rotations and approximate occupied-hex scale. The imported figure has coherent layered stone armor, a back quiver and angular bow from side views; the front review pose mostly hides the bow.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,5,highlands&p2-candidate=dravok-archer): the real Babylon scene loaded one imported preview of the authentic opening Archer `u1` at `(10,7)` on grass beside the city and canonical hero, zero page errors. Actual screenshot: `cross-tribe/dravok/archer/review/dravok-archer-live-board.png`. Requested tribe index `5` is injected as game roster slot `0` by the dev bootstrap; the UI and actual unflagged check identify it as **Dravok**, not Auren. Catalog slug `dravok-archer`, tribe index `5`, unit type `archer`; default match behavior is unchanged.
- **First-pass risks:** the tall ordinary crest contradicts the standardized short-crest convention, and on the captured board the rear-facing figure's bow is largely obscured. At 40px, the muted stone/brown palette and long head spike read more like a generic scout than an unmistakable bow unit, while side rotations show the weapon more clearly. The base reads rounder than the desired fractured hex. Keep these as whole-roster comparison notes, not aesthetic approval or authorization to tweak prematurely.

## Validation

- `pnpm check` and **27 focused registry tests** passed. Model Lab rendered 24 portraits; the opt-in Babylon board showed Dravok Archer `u1` with one preview node and no page errors; the GLB proxy returned HTTP 307.
- Ordinary unflagged Dravok retained one canonical hero, **zero imported GLB requests**, zero preview nodes and zero browser errors.
- Full **275-test/35-file** suite, Vite/server production build and `git diff --check` passed. The existing large-chunk size advisory remains unrelated to this query-gated catalog entry. No aesthetic approval or default substitution is implied.
