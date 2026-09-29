# Nerivane Warrior 3D Pilot

## Purpose

This pilot tests a controlled production path for replacing Sunder's procedural unit meshes with authored GLB assets without changing live gameplay models prematurely.

The candidate is integrated only into `/model-lab`, where it is rendered beside the current Nerivane Warrior using the same orthographic framing, transparent background, 40-pixel color/grayscale checks, and eight rotational views.

## Source and generation record

- **Approved concept:** Nerivane Warrior turnaround v1
- **Scenario generator:** Tripo P2 Multi View
- **Scenario asset ID:** `asset_S3nV1cxW54UkqNKXcU5Vtdpz`
- **Generation job:** `job_4beSTDzG8JiKpWdThAfuLhaj`
- **Inputs used:** front, true-left, and back orthographic views
- **Input intentionally omitted:** the available three-quarter view was not placed in the right-view slot because it is not a true 270° orthographic reference
- **Texture:** enabled
- **Texture quality:** Standard
- **Delight:** enabled
- **Texture alignment:** Original Image
- **PBR:** enabled
- **Auto Size:** enabled by the returned asset
- **Quad:** disabled
- **Seed:** `216669323`

## Asset record

- **WebDev storage path:** `/manus-storage/nerivane-warrior-tripo-p2-v1_a1ae73c5.glb`
- **SHA-256:** `4321b46367d64a77f97847fa858d16a8b53df07efc0e34e71595c8b6403e4b2e`
- **GLB size:** 2,413,564 bytes (2.30 MB)
- **Vertices:** 6,345
- **Triangles:** 5,093
- **Mesh primitives:** 1
- **Materials:** 1 PBR material
- **Textures:** 2048px base color, normal, and ORM maps
- **Animations:** none

The mesh is comfortably inside the pilot's 10,000-triangle and 5 MB source-file budgets. The textures are the main runtime cost: three uncompressed 2048px GPU maps are approximately 67 MB before device/driver overhead, so production units should use smaller or GPU-compressed textures.

## Current verdict

**Candidate — do not replace the live Warrior yet.**

The imported model is a successful technical proof:

- It loads from deployment-safe WebDev storage through Babylon's glTF loader.
- It is inexpensive geometrically.
- Its armor, crest, mask, and PBR material have more sculptural depth than the current procedural mesh.
- Its silhouette is stable around the complete rotation.

It does not yet beat the current model at Sunder's actual board scale:

- The torso and limbs are too narrow relative to the tall crest and spear.
- The richer texture treatment becomes low-contrast noise at approximately 40px.
- The current procedural unit has a chunkier mass, brighter faction blocks, and a stronger base, so it reads faster in play.
- The generated mesh has no animation or rig and is a single fused primitive, making cleanup and future motion harder.

## Recommended second pass

Use this GLB as a proportion and topology test, not as the final production asset. The next authored pass should:

1. Increase torso, shoulder, hand, and boot mass by roughly 20–30%.
2. Shorten the ordinary crest slightly and keep the spear head bold but less vertically dominant.
3. Separate body, weapon, and optional base into distinct objects/material regions.
4. Replace baked texture nuance with large teal, dark-teal, bone, and aqua value blocks.
5. Add a small tribe-colored fractured base or a separately composited board plinth.
6. Reduce textures to 512px or 1024px and prefer KTX2/Basis compression for production.
7. Keep the model under 10,000 triangles and test it at 40px before rigging.
8. Rig only after the silhouette and material pass clearly outperform the procedural baseline.

## Golden Warrior v2 — completed Blender pass

The recommended second pass is now implemented as a deterministic Blender build
in `scripts/build-golden-warrior.py`. The raw Tripo output was audited first and
found to contain **898 disconnected components** inside one fused primitive.
That topology was retained as a proportion reference rather than treated as a
riggable production source.

The authored v2 implements the requested cleanup:

- torso, shoulders, hands, boots, mask, and weapon are deliberately broader;
- the ordinary Warrior crest is shorter than the Tidecaller/Nereth hierarchy;
- the chest carries one oversized bone-and-aqua droplet instead of texture noise;
- body, spear, and fractured base remain separate runtime meshes;
- nine flat material regions are baked into vertex colors, eliminating texture
  memory while preserving large palette blocks;
- the editable source `.blend` preserves all 32 authored parts, while the runtime
  `.blend` and GLB consolidate them to three meshes.

Run the builder from the repository root with
`blender --background --python scripts/build-golden-warrior.py`. Outputs default
to a sibling `sunder-art-pipeline/nerivane-warrior/model` directory outside the
web bundle; set `SUNDER_ART_OUTPUT` to choose another directory.

### Final v2 asset record

- **WebDev storage path:** `/manus-storage/nerivane-warrior-golden-v2_7b699d63.glb`
- **SHA-256:** `0b5f5732bf7ab5105f013f17b84b28265926523f593a6af639e9674731378fcf`
- **GLB size:** 71,032 bytes (69.4 KB)
- **Uploaded vertices:** 1,578
- **Triangles:** 720
- **Runtime mesh primitives / draw calls:** 3
- **Material:** one shared vertex-color material
- **Textures:** none
- **Animations:** none

### Review status

The v2 clearly outperforms the raw Tripo candidate at 40px: it has stronger mass,
clearer value separation, a more stable grayscale silhouette, and a real Sunder
base. It is now a **golden candidate**, not yet the live default. The current
procedural Warrior remains the production baseline until the team chooses between
the procedural unit's sharper chest rune and taller crest versus v2's cleaner,
rounder authored silhouette.

Use these routes for the decision:

- `/model-lab` — three-way master, 40px color/grayscale, rotation, and occupied-hex comparison;
- `/?devgame=6104,11,4,highlands&golden-warrior=1` — opt-in real-board preview;
- the same `devgame` URL without `golden-warrior=1` — unchanged procedural baseline.

The live preview deliberately remains query-gated. Movement, visibility, shadows,
outlines, hit flash, and shatter paths run through the normal board unit node, but
the candidate is not used in ordinary matches.

## Verification

- TypeScript: `pnpm check`
- Focused registry tests: `CI=true pnpm vitest run server/imported-model-registry.test.ts`
- Full suite: `CI=true pnpm test`
- Production build: `NODE_OPTIONS='--max-old-space-size=2048' pnpm build`
- Visual review: open `/model-lab` with the default Nerivane tribe (`tribe=4`)
- Real-board review: open `/?devgame=6104,11,4,highlands&golden-warrior=1`
