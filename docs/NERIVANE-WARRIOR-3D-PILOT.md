# Nerivane Warrior 3D Pilot

## Purpose

This pilot tests a controlled production path for replacing Sunder's procedural unit meshes with authored GLB assets without changing live gameplay models prematurely.

The candidates are compared in `/model-lab` using the same orthographic framing,
transparent background, 40-pixel color/grayscale checks, and eight rotational
views. The approved P2 v1 can also replace ordinary Nerivane Warriors in an
explicitly opt-in real-board review mode; normal matches remain unchanged.

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

## Approved visual direction

**Scenario Tripo P2 Warrior v1 is the approved Nerivane Warrior target.**

The final side-by-side review found it clearly stronger than both the current
procedural model and the Blender v2 optimization study:

- its tapered proportions create a more natural, characterful silhouette;
- asymmetry and layered armor make it feel authored rather than assembled;
- the mask, crest, and spear form one coherent identity;
- surface detail survives at 40px without sacrificing the full-size sculptural read;
- its complete rotation remains stable and recognizable.

This visual approval overrides the earlier provisional concern that the unit was
too narrow at board scale. Do not broaden, simplify, or flatten the model toward
Blender v2. Future Nerivane units should inherit P2 v1's proportions, material
depth, armor layering, and silhouette language.

## Production implications

The P2 v1 appearance is locked, but the asset is not yet the default gameplay
model. Promotion should preserve the approved look while addressing engineering
needs conservatively:

1. Use the existing 5,093-triangle GLB as the visual source of truth.
2. Test texture downsizing or KTX2/Basis compression by direct image comparison;
   reject any optimization that visibly flattens the approved material treatment.
3. Rig or segment the model without changing its outline, proportions, armor
   layers, mask, crest, or spear.
4. Validate idle, move, attack, hit, and death motion in the opt-in board preview.
5. Generate the remaining Nerivane classes from controlled turnarounds using the
   same P2 visual language before replacing the complete live lineup.

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

Blender v2 is a **rejected visual direction**. It demonstrates that a texture-free,
three-draw-call unit can be produced cheaply, but its broad, rigid, toy-like forms
lose the character, taper, armor layering, and material depth that make P2 v1
successful. Keep it only as an optimization benchmark; do not use it as the design
template for the remaining lineup.

Use these routes for the decision:

- `/model-lab` — three-way master, 40px color/grayscale, rotation, and occupied-hex comparison;
- `/?devgame=6104,11,4,highlands&p2-warrior=1` — approved P2 v1 in the opt-in real-board preview;
- the same `devgame` URL without `p2-warrior=1` — unchanged procedural baseline.

The live preview deliberately remains query-gated. Movement, visibility, shadows,
outlines, hit flash, and shatter paths run through the normal board unit node, but
the candidate is not used in ordinary matches.

## Verification

- TypeScript: `pnpm check`
- Focused registry tests: `CI=true pnpm vitest run server/imported-model-registry.test.ts`
- Full suite: `CI=true pnpm test`
- Production build: `NODE_OPTIONS='--max-old-space-size=2048' pnpm build`
- Visual review: open `/model-lab` with the default Nerivane tribe (`tribe=4`)
- Real-board review: open `/?devgame=6104,11,4,highlands&p2-warrior=1`
