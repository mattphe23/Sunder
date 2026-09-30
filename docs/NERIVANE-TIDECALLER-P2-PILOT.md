# Nerivane Tidecaller P2 Repeatability Pilot

## Decision status

**Review candidate, not yet an approved visual target.** The approved Warrior, Archer, Defender, and aquatic Rider v2 remain unchanged. This Tidecaller is integrated into Model Lab and an opt-in deterministic board route only; ordinary matches continue to use the procedural unit.

## Locked design target

The Tidecaller must be unmistakable as the Nerivane unique caster at approximately 40 pixels: an exceptionally tall asymmetric aqua crest above a faceted ivory mask and dark cowl, broad shoulders, flared deep-teal robe, high-contrast ivory droplet chest sigil, large three-pronged trident with an aqua accent, and the shared fractured rune-lit stone base. The trident and crest should remain distinct in frontal, side, and rear views. Compare color and grayscale silhouettes against the existing procedural unit; do not infer approval solely from a successful generation.

## Production record

1. Isolated the Tidecaller from the approved `Sunder-Nerivane-Pilot-Lineup-v1.png` and removed adjacent lineup fragments without changing its design.
2. Created the locked four-view turnaround in Scenario workflow `wflow_Rqj2NscsQoE2BK4n5gX4NYFa`.
3. Normalized front, left, back, and right images, checked that the robe, crest, trident, and base remain intact, and submitted one textured PBR Tripo P2 Multi View generation.
4. Inspected the resulting model in Scenario, downloaded its GLB, audited geometry and embedded textures, and uploaded it to deployment-safe WebDev storage.

The exact prompt, source and output asset identifiers, generation settings, and seed are in `/home/ubuntu/sunder-art-pipeline/nerivane-tidecaller/scenario-record.txt`. The local GLB master is in `/home/ubuntu/sunder-art-pipeline/nerivane-tidecaller/model/` (not committed to GitHub; the deployed reference below is portable).

## Generated asset

| Field              |                                                         Value |
| ------------------ | ------------------------------------------------------------: |
| Scenario asset     |                              `asset_ts7XdES84Kv4U3w9YKRVkJ8S` |
| WebDev path        | `/manus-storage/nerivane-tidecaller-tripo-p2-v1_7816d57c.glb` |
| Source size        |                                               2,217,220 bytes |
| Vertices           |                                                         3,876 |
| Triangles          |                                                         5,184 |
| Runtime primitives |                                                             1 |
| Embedded textures  |                                                   3 × 2048 px |
| Pilot budget       |                                                          Pass |

The asset fits the existing pilot limits of 10,000 triangles, eight primitives, 5 MB and 2048-pixel textures. These are asset-level limits, not an on-device performance sign-off.

## Review routes

- Model Lab: `/model-lab?tribe=4`, Tidecaller comparison panel.
- Opt-in live board: `/?devgame=6104,11,4,highlands&p2-tidecaller=1`.

The development route converts only the deterministic human starter to a Tidecaller, then replaces only that Nerivane unit's procedural visual with the imported GLB. Rules, saves, and default gameplay are not changed.

## Initial visual assessment

The P2 figure is a substantial improvement in material cohesion and character finish: the tall swept crest, layered robe, pale mask, and coherent stone base make it read as a caster rather than a basic soldier. The eight-angle and grayscale views remain recognizable. On a clear grass hex, the imported model loaded correctly, stood on its base, and retained its teal/ivory palette. Its actual swap was confirmed by the `p2TidecallerPreview` unit metadata and successful GLB response; there were no browser page errors.

Two differences warrant the owner's judgment before approval: it is notably slimmer and quieter at 40 pixels than the bulky procedural baseline, and the near-black three-prong trident becomes staff-like against a dark background. The robe flare and crest are strong, but the weapon may need a brighter bone or aqua treatment if the class must be instantly identified by its trident. A nearby procedural unit and city can overpower it on the occupied board. These are visual tradeoffs, not asset-budget failures.

Review captures in the working art-pipeline folder (not committed assets): `review/tidecaller-procedural-vs-p2.png` and `review/tidecaller-live-board-clear-grass.png`. For the latter, only the review camera and model node were temporarily positioned on an explored empty grass tile; the game rules and saved state were not altered.

## Acceptance questions

- At 40 pixels in color and grayscale, does the P2 read as a caster rather than a spear Warrior?
- Are the three prongs visible and correctly separated from the crest and arm across the eight rotation views?
- Does the flared robe and tall crest remain legible on a busy occupied hex without overpowering the other infantry?
- Does the faceted mask, teal/ivory palette, and fractured base match the approved family?
- Does the live-board model remain correctly grounded and reasonably scaled during camera rotations?

Keep the candidate as `review-candidate` until the user judges the pasted direct comparison. Approval of art direction does not automatically enable the model for default gameplay.
