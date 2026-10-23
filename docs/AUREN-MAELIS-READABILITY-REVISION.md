# Auren Maelis readability revision — planned candidate

## Current decision

The round-1 character worker confirmed the Auren commander is **Maelis**, `AUREN_MAELIS_PILOT` / `auren-maelis`. The current warrior remains unchanged. No revised Maelis art, GLB, texture or renderer override was generated or substituted in this pass. All models remain review candidates; the owner approves aesthetics.

The existing Maelis is narrower and darker than the warrior at the same normalization height: its source X width is approximately 73% of the warrior's, and over half of its base-color texels fall below luminance 64 versus approximately 23% for the warrior. Normal/material layout is shared, there is no Maelis-specific occlusion texture, and the board has no active shadow generator. PBR lighting accentuates the authored dark surfaces but does not explain away the silhouette problem. These measurements are diagnostic, not a substitute for visual review.

Do not globally brighten other imported characters or attach procedural armor to mask this issue. Preserve the existing Maelis original and audited 512px derivative as comparison controls, alongside their provenance.

## Next authored review candidate

Retain Auren blue/gold, an upright compact figurine pose, faceted mask-face language and a heroic cape. Give the crown/crest a taller, unmistakable shape distinct from the separate in-engine level marker. Broaden the shoulder/cape mass instead of uniformly enlarging the whole model. Add one large light or warm mid-value mantle, collar, shoulder or trim region against the dark torso; avoid turning the whole hero gold or adding emissive glare. Recognition must come from large silhouette and value blocks, not micro-details.

At approximately 40 CSS pixels of standing-character height, crown, head/shoulder break and torso/cape mass should read clearly in the normal three-quarter board camera on both grass and forest. City overlap remains a separate readability issue.

Any new art must be separately named, retained externally and registered as a review candidate. Preserve the existing model and warrior; do not overwrite either or silently change beta mappings. Require a fresh geometry/material/provenance audit and separately audited 512px runtime derivative within the existing model/cache budgets. No paid generation, Scenario calls or rigging were part of the team launch.

## Required comparison and acceptance

Use authentic unaltered phone captures at the same camera and scale: current Maelis versus the new candidate on original and optional world-v3 terrain, with the warrior as unchanged control. Show a normal view and modest orbit that reveals shoulders/cape. The owner judges crown recognition, forest separation, silhouette and value contrast. A technically valid model is not automatically aesthetically approved or a default replacement.

Detailed external diagnosis and production brief: `/home/ubuntu/sunder-team/round-1/characters/REPORT.md` and `REVISION-BRIEF.md`. These are completed analysis/brief artifacts, not proof that new Maelis art exists. New characters remain an explicit reversible default-off beta setting with procedural failure fallback.
