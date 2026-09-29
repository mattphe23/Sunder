# Nerivane Defender P2 Repeatability Pilot

## Decision status

**Review candidate — awaiting visual sign-off.**

The Defender was produced with the same controlled Scenario pipeline that yielded the approved Nerivane Warrior and Archer. It is integrated into Model Lab and an opt-in live-board route for comparison, but it does not replace the procedural gameplay model by default.

## Design target

The Defender must read as the broad defensive member of the approved Nerivane family:

- faceted bone mask in a dark cowl;
- short pale crest reserved for an ordinary class;
- deep-teal/turquoise armor with bone accents;
- large pointed tower shield as the dominant class silhouette;
- compact one-handed weapon kept subordinate to the shield;
- fractured stone base with a tribe-colored rune fissure;
- clear at approximately 40 pixels in both color and grayscale.

## Production pipeline

1. Isolate the Defender from `Sunder-Nerivane-Pilot-Lineup-v1.png` without redesigning it.
2. Generate one locked four-view turnaround in Scenario Turnaround Studio.
3. Normalize front, left, back, and right views to a shared scale.
4. Generate one textured/PBR mesh with Scenario Tripo P2 Multi View.
5. Download the GLB, inspect its binary payload, and upload it to WebDev storage.
6. Compare procedural and P2 versions in Model Lab and on a deterministic live board.

The complete local production record is preserved at:

`/home/ubuntu/sunder-art-pipeline/nerivane-defender/scenario-record.txt`

## Generated asset

| Field              |                                                       Value |
| ------------------ | ----------------------------------------------------------: |
| Scenario asset     |                            `asset_TPq7DNz9t2ndxB7mWrgGWZBf` |
| WebDev path        | `/manus-storage/nerivane-defender-tripo-p2-v1_5c6aee77.glb` |
| Source size        |                                             3,042,840 bytes |
| Vertices           |                                                       6,751 |
| Triangles          |                                                       5,247 |
| Runtime primitives |                                                           1 |
| Embedded textures  |                                                 3 × 2048 px |
| Budget result      |                                                        Pass |

The mesh remains below the pilot limits of 10,000 triangles, eight runtime primitives, 5 MB, and 2048-pixel textures.

## Review routes

- Model Lab: `/model-lab?tribe=4`
- Live-board comparison: `/?devgame=6104,11,4,highlands&p2-defender=1`

The live-board query converts only the deterministic development starter into a Defender and swaps only that Nerivane unit to the imported GLB. Normal gameplay is unchanged.

## Acceptance questions

1. Does the tower shield remain obvious at 40 pixels?
2. Does the mask-and-crest silhouette remain consistent with the approved Warrior and Archer?
3. Is the shield broad enough to communicate defense without making the body disappear?
4. Do the rear and side views avoid fused shield/body geometry or unreadable negative space?
5. Does the imported model sit naturally on the real board at the same visual scale as other units?

If approved, change the registry decision from `review-candidate` to `approved-target` and lock the Defender as the third accepted P2 class. If rejected, preserve this asset and its measurements as a reproducible study rather than silently replacing it.
