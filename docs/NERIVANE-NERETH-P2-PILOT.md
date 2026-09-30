# Nerivane Nereth P2 repeatability pilot

## Decision status

**Approved visual target (owner decision, 2026-09-30).** After reviewing the procedural/P2 comparison and live-board image, the owner said: “I approve your direction. I like it.” Scenario Tripo P2 Nereth v1 remains opt-in on the development board. **Art approval is not a production rollout:** neither the ordinary hero visual nor the game rules have changed. The Warrior, Archer, Defender, aquatic Rider v2 and Tidecaller visual directions remain approved separately.

## Locked art target

Nereth should read as the Nerivane hero at approximately 40 pixels: angular gold crown in front of a tall swept aqua fin crest, faceted ivory mask, broad deep-teal cape and mantle, teal/bone wave-cut armor, bone-on-teal droplet emblem, upright banner-spear with dark diamond tip and aqua pennant, and the common fractured rune-lit base. Distinguish his crown-and-cape silhouette from both the spear Warrior and tall-crested Tidecaller in color, grayscale, side/back rotation, and real board context. An asset passing geometry limits alone is **not** artistic acceptance.

## Production chain

1. Isolated Nereth from the approved `Sunder-Nerivane-Pilot-Lineup-v1.png` and generated a controlled front/left/back/right turnaround with Scenario workflow `wflow_HscfP6gU8TGBhPkeN6XzQxm3`.
2. Inspected the 3840×2160 turnaround and 40px study; normalized four 1024×1024 views; submitted **one** Tripo P2 Multi View job `job_CUqgXtoQQfFRLvQvP7Hkaue7` with texture, PBR and Delight on, standard quality, default version/orientation, original-image alignment, and Auto Size/Quad off. Delight on matches the verified Rider/Tidecaller production records, despite a conflicting inherited narrative.
3. Inspected the Scenario viewer, downloaded its GLB, audited its geometry and three embedded 2048px textures, and stored the binary outside GitHub in WebDev storage.

The complete source prompt, individual input asset IDs, output seed `264746414`, SHA-256 and settings are recorded in `/home/ubuntu/sunder-art-pipeline/nerivane-nereth/scenario-record.txt`. The local master is `model/nerivane-nereth-tripo-p2-v1.glb` in that art workspace; it is not committed to the repository.

## Generated asset

| Field | Value |
| --- | --- |
| Scenario asset | [`asset_VPV6Feg41fyc1si5xKTdwZXG`](https://app.scenario.com/assets?openAssetId=asset_VPV6Feg41fyc1si5xKTdwZXG) |
| WebDev path | `/manus-storage/nerivane-nereth-tripo-p2-v1_0847ff85.glb` |
| Source size | 3,124,068 bytes (2.98 MiB) |
| Vertices | 6,178 |
| Triangles | 4,566 |
| Runtime primitives | 1 |
| Materials | 1 |
| Embedded textures | 3 × 2048px (PNG, JPEG, JPEG) |
| Pilot budget | Pass (≤10,000 triangles, ≤8 primitives, ≤5 MiB, ≤2048px) |

These are asset-level limits; they do not establish performance on a phone or approve production rollout.

## Review routes

- Model Lab: `/model-lab?tribe=4#nereth-comparison` — current procedural Nereth versus the approved imported visual target, full portrait, 40px color/grayscale, eight rotations and approximate occupied-hex thumbnails.
- Deterministic development board: `/?devgame=6104,11,4,highlands&p2-nereth=1` — the standard Nerivane hero spawned alongside the capital is visually replaced. **No extra hero is spawned and the Warrior starter is not converted.** The `devgame` starter route exists only in development; the P2 renderer swap is also gated by `p2-nereth=1`. No normal-match visual is changed without that explicit query flag.

## Acceptance questions

- Is the crown clearly legible at 40px and visibly distinct from Tidecaller's crest and the ordinary Warrior's helmet?
- Does the banner-spear silhouette remain upright and readable from the side and rear without swallowing the cape?
- Does the model retain the tribe's mask, teal/ivory palette, droplet emblem, and fractured base across rotations?
- Is the hero grounded and appropriately scaled on a live, occupied hex beside other units?

## Verified review results

- `pnpm check` passed; `CI=true pnpm test` passed **258 tests in 35 files**; `NODE_OPTIONS='--max-old-space-size=2048' pnpm build` passed (Vite reports the existing large-chunk warning).
- A GET through the local `/manus-storage/` proxy returned **3,124,068 bytes with the same SHA-256** as the downloaded GLB (`cb3a38bfea0d74febac02a65d96bb6b429c78af3e3ddab7108944b0cd459b336`).
- The Model Lab captured 24 Nereth comparison images (2 full-size, 4 40px, 16 rotations, 2 occupied-hex tiles); the import rendered without page errors. Evidence: `nereth-procedural-vs-p2.png` in the external `review/` art workspace.
- On development seed `6104`, the existing human hero `u2` at `(9, 6)` was replaced in the real Babylon scene (`p2NerethPreview: true`) and the eight other match units remained intact. Evidence: `nereth-live-board-focused.png` and its unaltered-pixel crop `nereth-live-board-detail.png` in that same workspace. The capture rotates/zooms the camera only; it does not modify the game state.
- Negative control: the same seed without `p2-nereth=1` retained its single procedural hero, set **zero** Nereth preview flags and made **zero** requests for the Nereth GLB.
- The P2 hero has a more cohesive banner-spear, cape, and mask, with visible rune fissures and distinct gold/aqua crown-crest layering. The **slimmer silhouette and much smaller crown/emblem at 40px** may read less strongly than the blocky procedural hero; this is a documented readability consideration for any later production rollout, not a reason to override the owner's art approval.

**Visual decision: approved.** The registry decision is `approved-target`; the only in-game swap remains `p2-nereth=1`. Bringing any imported model into default gameplay across the Nerivane lineup is a separate decision and requires follow-up implementation and QA.
