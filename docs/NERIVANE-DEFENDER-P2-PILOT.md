# Nerivane Defender P2 Repeatability Pilot

## Decision status

**Approved target.**

The user approved Scenario Tripo P2 Defender v1 after reviewing the complete Model Lab comparison and the imported model on the live board. It is the third accepted P2 class after Warrior and Archer. The opt-in review route remains available for regression checks; normal gameplay is still unchanged until the approved set is ready for a deliberate rollout.

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

## Acceptance result

The approved model passes the review gates:

- the shield remains immediately recognizable at 40 pixels in color and grayscale;
- the mask, crest, teal armor, and fractured base match the approved Warrior and Archer family;
- the broad shield communicates defense without erasing the body silhouette;
- side and rear rotations remain readable;
- the imported model sits naturally on the deterministic live board;
- the one-draw-call mesh remains within every mobile pilot budget.

The registry decision is locked to `approved-target`. The next controlled P2 class is the **Nerivane Rider**, where mount silhouette and rider/mount separation become the primary acceptance risks.
