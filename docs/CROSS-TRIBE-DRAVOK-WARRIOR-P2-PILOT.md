# Dravok Warrior — Scenario P2 first-pass review candidate

**Decision: review-candidate, not approved and not default gameplay.** This is one of the other tribes’ first-pass visual studies. Per the owner’s direction, cover the remaining tribe roles before an aesthetic revision pass; all ordinary Dravok units remain procedural.

## Source and generation provenance

- Dravok six-role concept lineup: Scenario [`asset_w16fs8e2yBXeUHbii5yGVCFr`](https://app.scenario.com/assets?openAssetId=asset_w16fs8e2yBXeUHbii5yGVCFr). The isolated Warrior reference was uploaded as `asset_cRbXn9rMobvY1vyJbrqeRbKz`. The exact locked prompt and source crops are preserved outside Git in the cross-tribe art workspace.
- One GPT Image 2.5 Sunburst orthographic four-view [turnaround `asset_kthYER6yycKzTCo1k1LmjvMn`](https://app.scenario.com/assets?openAssetId=asset_kthYER6yycKzTCo1k1LmjvMn), job `job_xx7JuRxxwDxNYEgeqAvB1q3x`: 3840×2160 native PNG, one reference/image, Quality Auto, Background Auto, displayed 18 CU. The archived original has SHA-256 `69037e3ff8647853f16eb1c237ed5fefde119188c6e9255be354eaa225be1e8f`; the four genuine front/left/back/right views were inspected and normalized to 1024×1024 each.
- Tripo P2 Multi View input assets: front `asset_hW9EG7hzdYbtwMN1VCZQRyZb`; left `asset_WAq68trT1coThk3SwAjDqq4U`; back `asset_YZSRHm8VUkF5t9bFehepEUQx`; right `asset_oS28F9f77cZrp17ZehcE7QY9`. One verified 220-CU job `job_aXowfwS6ECukCaQUwVpnptBK` produced [output `asset_5BXDnyUni43NVPN2tRTpsRwT`](https://app.scenario.com/assets?openAssetId=asset_5BXDnyUni43NVPN2tRTpsRwT), seed `614060335`. Texture, PBR and Delight **on**; Auto Size and Quad **off**; Standard quality, Original Image alignment, default orientation/version, blank face limit.
- Original GLB is archived at `dravok/warrior/model/dravok-warrior-tripo-p2-v1.glb` outside Git. SHA-256 `45205915d34d160c0f6a536ca9504ec529c8926d24ec869207ba2bc08db77649`; deployment URL `/manus-storage/dravok-warrior-tripo-p2-v1_881c5daf.glb`. Binary media are never added to `client/public` or Git.

## Read-only GLB budget audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 5,270 | Informational |
| Triangles | 3,593 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| GLB bytes | 3,162,552 | ≤5,242,880 |
| Material / embedded textures | 1 / 3 | Informational |
| Embedded texture dimensions | 2048×2048 each | ≤2048×2048 |

All budget gates pass. The viewer reported 5,259 vertices; the registry deliberately uses the audited glTF accessor count of 5,270. The full audit JSON is preserved beside the external master.

## Review behavior and visual evidence

- Live development Model Lab: `/model-lab?tribe=5#dravok-warrior-comparison`. Its rendered panel contains a full-size procedural/P2 pair, 40px color/grayscale, eight rotations per variant, and approximate occupied-hex context. Local proof: `dravok/warrior/review/dravok-warrior-procedural-vs-p2.png` outside Git. GitHub publication does not by itself prove that any public deployment has updated to this build.
- Query-gated development-only Babylon board: `/?devgame=6104,11,5,highlands&p2-candidate=dravok-warrior`. For tribe definition index **5**, player roster slot **0** is Dravok; the real opening Warrior `u1` is shown on clear adjacent grass at `(10,7)` only on this review route. The scene loads `p2CrossTribePreview` for `u1`; no gameplay rule, starter unit class or normal render default changes. Local proof: `dravok/warrior/review/dravok-warrior-live-board.png` outside Git.
- The P2 shield/cleaver asymmetry and short crest remain distinct in front/side views. However, the turnaround’s cleaver became **upright rather than the low-held chipped blade in the prompt**. At 40px the ochre chest/rune marking is muted, with gray-brown armor and a narrow figure that blend into Dravok’s mountain terrain on the actual board; its weapon rises like a tall spear. The much brighter procedural baseline has a larger, clearer occupied-hex silhouette. Preserve these as cross-roster comparison notes rather than tweaking this candidate prematurely.

## Validation

- Babylon Model Lab rendered **24 real portraits**; the live Dravok board imported the actual Warrior `u1` on grass at `(10,7)` with no browser page errors. The storage proxy returned HTTP 307 to a signed GLB URL.
- `pnpm check` and the focused imported-model registry guardrail (**18 tests**) passed.
- The normal board `/?devgame=6104,11,5,highlands` resolved player roster slot zero to **Dravok**, created one canonical hero, and made **zero imported GLB requests**, **zero cross-tribe preview nodes**, and **zero page errors**.
- The full regression suite passed **266 tests in 35 files**; the production build passed. Vite emitted only its existing non-fatal large-chunk warning.
