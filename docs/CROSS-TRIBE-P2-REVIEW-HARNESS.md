# Cross-tribe P2 visual review harness

**Scope:** first pass across Auren, Kharzul, Sunwei, Vessari, Dravok, Valkyra, and Mycelon. The seven original Scenario lineup sheets are concept art; a unit enters this harness only after its own four-view turnaround, Tripo P2 GLB download, geometry audit, and storage upload. Nerivane's owner-approved targets remain separate from these unapproved cross-tribe candidates.

## Adding a candidate

1. Isolate one figure from its tribe's original lineup; review an actual 3840 × 2160 front/left/back/right Scenario turnaround, not an AI-drawn thumbnail rotation strip.
2. Normalize all four images to 1024 × 1024; verify the weapon, mount, and fractured base remain intact. Submit one Tripo P2 Multi View job with Texture, PBR, and Delight **on**, Standard quality, Original Image alignment, Default orientation, Auto Size and Quad **off**.
3. Download the original GLB. Audit triangles, runtime primitives, bytes, and embedded texture resolution against `IMPORTED_MODEL_PILOT_LIMITS`. Upload outside the repository via `manus-upload-file --webdev`.
4. Add an `ImportedModelCandidate` with `decision: "review-candidate"` and a unique `{ slug, tribeIndex, unitType, candidate }` entry to `CROSS_TRIBE_P2_PILOTS`. Add a provenance note and update registry tests. Do not create missing GLB entries or mark them approved.
5. Review `?tribe=<index>` in Model Lab: each cataloged model loads only on its own tribe, with full portrait, 40px color/grayscale, eight rotations, approximate occupied hex, and asset budgets. Compare the real Babylon board at `/?devgame=6104,11,<index>,highlands&p2-candidate=<slug>`. Use an appropriate deterministic seed if a starter has no clear adjacent land tile.

## Safety and verification

- Both the deterministic starter conversion and imported Babylon swap require a **development-only `devgame` query** plus an exact catalog slug; normal gameplay stays procedural. The existing Auren Warrior `p2-auren-warrior=1` URL is retained for prior pilot comparisons.
- For non-hero units, the review route converts only the human opening Warrior to the requested class and moves that unit onto a free adjacent grass tile if possible, to prevent city-geometry occlusion. Hero reviews use the existing hero; no additional hero is spawned. These are isolated visual test states, not save-game or balance changes.
- Do not mistake a 2D lineup or a 40px concept proof for an imported 3D unit. An art decision of `approved-target` requires explicit owner approval. Approval of art does **not** itself authorize default-model deployment.
- Validated with the Auren Warrior catalog entry on seed 6104: 24 Model Lab portrait images, imported mesh tagged `p2CrossTribePreview` on the real board, no page errors. The same ordinary devgame without a `p2-*` flag requested zero Auren GLBs and had zero imported preview nodes. Full TypeScript/test/build verification remains required with every new catalog entry.

Working assets and seven-tribe progress record are preserved outside Git under `/home/ubuntu/sunder-art-pipeline/cross-tribe/` to avoid bundling large images and GLBs into the web app.
