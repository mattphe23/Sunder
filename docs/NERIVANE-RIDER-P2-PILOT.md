# Nerivane Rider P2 Repeatability Pilot

## Decision status

**Aquatic v2 is the approved visual target. Rider v1 remains a retained comparison study.**

Scenario Tripo P2 Rider v1 established a much stronger mounted silhouette. Following review feedback that its mount could read more aquatic, a controlled v2 changed only the mount direction: longer fish-like body, broad lateral fins, tapered tail, and a cleaner marine profile. The user approved aquatic v2 after the direct Model Lab and matched live-board comparison. Both versions remain on separate opt-in review routes; normal gameplay is unchanged by this art-direction decision.

## Design target

The Rider must read as the fast mounted member of the approved Nerivane family:

- faceted bone mask in a dark cowl;
- short pale crest reserved for an ordinary class;
- deep-teal/turquoise armor with bone accents;
- rider and mount readable as two distinct forms;
- streamlined aquatic mount rather than a realistic horse or boar;
- long spear providing a strong directional silhouette;
- fractured stone base with a tribe-colored rune fissure;
- clear at approximately 40 pixels in both color and grayscale.

## Production pipeline

1. Isolate the Rider from `Sunder-Nerivane-Pilot-Lineup-v1.png` without redesigning it.
2. Generate one locked four-view turnaround in Scenario Turnaround Studio.
3. Normalize front, left, back, and right views to a shared scale and remove cross-panel contamination.
4. Generate one textured/PBR mesh with Scenario Tripo P2 Multi View.
5. Download the GLB, inspect its binary payload, and upload it to WebDev storage.
6. Compare procedural and P2 versions in Model Lab and on a deterministic live board.

The complete local production record is preserved at:

`/home/ubuntu/sunder-art-pipeline/nerivane-rider/scenario-record.txt`

The aquatic refinement record is preserved at:

`/home/ubuntu/sunder-art-pipeline/nerivane-rider/scenario-record-v2.txt`

## Generated asset

| Field              |                                                    Value |
| ------------------ | -------------------------------------------------------: |
| Scenario asset     |                         `asset_hppRhFGzZxpLErL7XoyyV6r8` |
| WebDev path        | `/manus-storage/nerivane-rider-tripo-p2-v1_4f4ceb63.glb` |
| Source size        |                                          2,608,272 bytes |
| Vertices           |                                                    6,034 |
| Triangles          |                                                    5,427 |
| Runtime primitives |                                                        1 |
| Embedded textures  |                                              3 × 2048 px |
| Budget result      |                                                     Pass |

The mesh remains below the pilot limits of 10,000 triangles, eight runtime primitives, 5 MB, and 2048-pixel textures.

## Aquatic v2 asset

| Field              |                                                    Value |
| ------------------ | -------------------------------------------------------: |
| Scenario asset     |                         `asset_kLxCjo8ZUZRUuFvkYtKYCwoP` |
| WebDev path        | `/manus-storage/nerivane-rider-tripo-p2-v2_b6bf26e0.glb` |
| Source size        |                                          2,785,372 bytes |
| Vertices           |                                                    5,973 |
| Triangles          |                                                    4,987 |
| Runtime primitives |                                                        1 |
| Embedded textures  |                                              3 × 2048 px |
| Budget result      |                                                     Pass |

Aquatic v2 is slightly smaller geometrically than v1 while keeping the same one-draw-call runtime structure and texture ceiling.

## Review routes

- Model Lab: `/model-lab?tribe=4`
- Live-board v1: `/?devgame=6104,11,4,highlands&p2-rider=1`
- Live-board aquatic v2: `/?devgame=6104,11,4,highlands&p2-rider-v2=1`

Each live-board query converts only the deterministic development starter into a Rider and swaps only that Nerivane unit to the selected imported GLB. Normal gameplay is unchanged.

## Acceptance focus

The candidate must pass the same baseline tests as the approved Warrior, Archer, and Defender, plus mounted-unit checks:

- the rider and mount remain visually separable at 40 pixels;
- the spear reads clearly from front, side, and three-quarter angles;
- the mount reads as a compact aquatic creature rather than a horse or boar;
- the combined silhouette fits one occupied hex without looking cramped;
- the mask, crest, teal armor, and fractured base match the approved family;
- the live-board scale does not overpower neighboring infantry;
- the one-draw-call mesh remains within every mobile pilot budget.

The registry locks aquatic v2 as `approved-target` and keeps v1 as `rejected-study` for reference. Approval establishes the art direction, **not** a default-runtime replacement or shipping/mobile-performance sign-off. Next production candidate: the Nerivane Tidecaller, preserving its towering crest, robe, and oversized three-pronged trident.
