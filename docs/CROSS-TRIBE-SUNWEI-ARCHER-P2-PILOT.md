# Sunwei Archer — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not approved and not enabled in ordinary gameplay.** The owner requested a breadth-first pass across the non-Nerivane rosters before subjective visual refinements. This imported asset is reachable only through explicit development review routes.

## Provenance

- The [Sunwei concept lineup](https://app.scenario.com/assets?openAssetId=asset_uNgpbDtXyiz3gY6UDAPRA3A3) supplied an isolated 1024² Archer source. Its far-left margin contained one disconnected dark wedge. A technical repair transplanted **only** AI-cleaned background pixels into that remote margin using `sunwei/archer/repair-source-wedge.py`; all central figure, bow, arrows and base pixels remain bit-for-bit original outside that mask. The actual reference `sunwei-archer-source-wedge-repaired.png` has SHA-256 `76510c7b27530ed629ceacadd54c581a840fdba72d3ae73696f3f3e1460ff358` and was uploaded once as Scenario `asset_WaQBssUH7wDHDsjyXDTtTLDf`. The original crop, AI background intermediate and repair script are archived outside Git.
- The submitted prompt matched the locked text without its trailing newline: SHA-256 `dc4aef950bfa83ff09e223ea6c1634bb48ea67109e91b32f56886e27662e197f`. A single [Sunburst job `job_ngQuR19CfybdYrs49QPFkj39`](https://app.scenario.com/create?restartGeneration=job_ngQuR19CfybdYrs49QPFkj39) produced [turnaround asset `asset_Nm8d4gcixSVavH2SzmbgSA4r`](https://app.scenario.com/assets?openAssetId=asset_Nm8d4gcixSVavH2SzmbgSA4r): one source, one image, physical 3840×2160, Quality/Background Auto, displayed 18 CU. The native PNG is 8,011,088 bytes, SHA-256 `7de376d717069d3dc560cb63e56f181014bd4744c554f582f474279b1f4f1c61`. Distinct front, left, back and opposite-right views were visually inspected, then normalized into four non-stretched 1024² crops.
- P2 assets in slot order: front `asset_TVphqyiavZmxzGyJ9N2Wuhwx`, left `asset_2KRQ2m6XXLwHvjgmJDNUgtgM`, back `asset_GBVNQCfRuckxo46Sv4BdWtRP`, right `asset_Yc4GsFDS7vypcPMyu2npyLdd`. One 220-CU non-Quad [Tripo P2 job `job_6eKubbjJiMoPWqzXTaM7ucgN`](https://app.scenario.com/create?restartGeneration=job_6eKubbjJiMoPWqzXTaM7ucgN) produced [3D asset `asset_pCbHBgedxLF7KxE8gPsHrseU`](https://app.scenario.com/assets?openAssetId=asset_pCbHBgedxLF7KxE8gPsHrseU). Texture/PBR/Delight **on**; Auto Size/Quad **off**; Standard quality, Original Image alignment, default orientation/version and blank face limit.
- Native GLB master `cross-tribe/sunwei/archer/model/sunwei-archer-tripo-p2-v1.glb` remains outside Git, SHA-256 `911c639ccd44a827c74775d5c76741c26a02b1e44132518da1ea566d73128a9`. WebDev path `/manus-storage/sunwei-archer-tripo-p2-v1_580bcfff.glb` returns HTTP 307. Never put GLB media in `client/public` or Git.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,661 | Informational |
| Triangles | 5,006 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 2,811,944 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile budget gates pass. The values come from the native downloaded GLB accessor audit, preserved as `model/audit.json` outside Git, not from a screenshot or viewer estimate.

## Actual visual review and routes

- Query-gated [Model Lab comparison](https://polyclone-n6b64njm.manus.space/model-lab?tribe=2#sunwei-archer-comparison): actual `cross-tribe/sunwei/archer/review/sunwei-archer-procedural-vs-p2.png` contains **24 rendered portraits**—full procedural/P2, 40px color/grayscale, eight rotations and approximate occupied-hex scale.
- [Development board](https://polyclone-n6b64njm.manus.space/?devgame=6104,11,2,highlands&p2-candidate=sunwei-archer): the real Babylon scene loaded one imported preview of authentic opening Archer `u5` at `(2,1)` on grass next to the canonical hero and city, zero browser page errors. Actual screenshot: `cross-tribe/sunwei/archer/review/sunwei-archer-live-board.png`. The candidate is catalog slug `sunwei-archer`, tribe index `2`, unit type `archer`; default match behavior is unchanged.
- **Strength:** a coherent armored bow soldier with independent rear/side geometry, visible arrows/quiver, warm gold crest and compact stone base; stronger gold cue than Sunwei Warrior’s muted pilot. **First-pass risks:** the P2 figure is visibly smaller and duller than the bright procedural Archer at 40px; the front view and board-facing pose hide most of the bow, weakening immediate Archer recognition, though side rotations show it. Its gold is concentrated in the crest rather than a broad cloth mark, and the base reads rounder than the intended fractured hex. Keep these as full-roster comparison notes, not aesthetic approval or authorization to tweak prematurely.

## Validation

- `pnpm check` and **26 focused registry tests** passed. The Model Lab rendered 24 portraits, and the opt-in Babylon board showed authentic Archer `u5` with one preview node and no page errors; the GLB proxy returned HTTP 307.
- Ordinary unflagged Sunwei retained its canonical hero with **zero imported GLB requests**, **zero preview nodes** and zero page errors.
- Full **274-test/35-file** suite, Vite/server production build and `git diff --check` passed. No approval or default substitution is implied.
