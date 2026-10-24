# Auren ordinary Swordsman beta pilot

## Scope

The pilot adds one separately audited **Auren ordinary land Swordsman** to the existing **New visuals (beta)** setting. The setting is still default-off and reversible. The model is selected by designed faction identity `defIndex=0`, not a player's game seat. It is not substituted for the Warrior, Maelis, neutral Guardian, another faction, a boat, a raider, a hero or a custom/skinned tribe.

This is a review candidate, not owner aesthetic approval or a default-art promotion. The original 46-entry development-review roster, original registry, derivative manifest, Warrior and Maelis records remain unchanged. Other factions' Swordsmen, Knights, Catapults and Colossi remain known visual-coverage gaps. The separate neutral Guardian is not an ordinary Swordsman replacement.

## Preserved provenance and runtime derivative

The new image source, original GLB, deterministic 512px derivative, audit, legal save, screenshots and reusable capture scripts remain outside Git and `client/public` under `/home/ubuntu/sunder-team/swordsman-callback-20261024/`.

| Item | Recorded value |
| --- | --- |
| Candidate | `auren-swordsman-p1`, decision `review-candidate` |
| Generation | `job_m_66a1f6ee98cbcca58e0a`, `image/P2-20260801`; 5,000-face requested limit |
| Geometry | 6,666 vertices; 4,828 triangles; 1 runtime primitive; 1 material |
| Original GLB | `/manus-storage/auren-swordsman-p1-p2_3daceace.glb`; 3,814,544 bytes |
| Runtime GLB | `/manus-storage/auren-swordsman-p1-beta-512_d9ac7986.glb`; 812,316 bytes |
| Embedded textures | Maximum edge 512px; conservative RGBA8/mipmap estimate 4,194,306 bytes |
| Original GLB SHA-256 | `2f16d6aa1e845d997ad4d43d623ed246186be0e0ce802db32af6f49396d0efa9` |
| Runtime GLB SHA-256 | `98627ba4974ffe729a40e4419de3058cf90d8ba672182abf5d624ddd844f0b0b` |

The deterministic derivative audit independently verified unchanged non-image structure and all geometry/material-buffer bytes. Only embedded texture dimensions/encoding and their buffer layout differ. The original is preserved as provenance, never admitted as a gameplay fallback. `betaAdvancedVisuals.ts` is a separate record; `betaVisualRevisions.ts` admits only its exact derivative URL and the existing allow-listed native origin.

The scene cache retains its 64 MiB estimated texture/reservation ceiling, 16-template limit, two concurrent loaders and 15-second load timeout. Templates are shared; each unit has its own transform. These limits and texture estimates are not total iPhone RAM or performance measurements.

## Engineering evidence

The final source passed TypeScript, **473 tests across 63 files**, production build and `git diff --check`. The expanded focused playtesting runner passed all nine groups, including the advanced selector and the callback/navigation-deadline regressions. The iOS copy matched all 13 production web files byte-for-byte; no native settings, package paths or signing files were changed.

The genuine Babylon phone fixture verified default-off zero Swordsman requests, two independent Swordsman clones from the same template, unchanged Warrior/Maelis/Guardian paths, preserved veteran/selection cues, unchanged match/save on visual rollback, and a visible procedural actor after an intentionally blocked model request. A disclosed approximately-40-CSS-pixel *projected bounding-box* capture is an engineering scale check, not proof that every pixel silhouette is distinguishable. Its camera radius lies slightly beyond the normal maximum and is not used for normal gameplay captures. The initial scale fixture failed to converge at its limit; it is retained as superseded harness evidence, not a game defect.

A separate production check used seed `61040`, a 9×9 Pangaea Auren/Kharzul **two-human hotseat** game. Existing GameStore actions legally researched Climbing (4 stars), Mining (6), Smithery (8), vacated the capital, and trained Swordsman #6 for 5 stars in round 7. The unedited ordinary autosave and action ledger are retained. This is lawful progression evidence, **not** a normal-AI-game claim or a claim that the research UI was traversed.

That save was loaded through the visible Continue/handoff controls in a full API-serving production build, without production GameStore debug access. Actual canvas selection, exact derivative decode, preference persistence/reload, byte-identical save on opt-in/opt-out, restored procedural rendering, and selectable failure fallback passed. The first reload attempt wrongly required an already-dismissed handoff to reappear; its failure is retained and the corrected test respects normal persisted dismissal.

The existing ordinary UI lane also completed default/beta matches, movement, three turns and reload without runtime invariant failure. Its default seed had no eligible harvest resource, explicitly recorded as limited coverage; the beta case covered harvest. It exited promptly after navigation deadline cleanup instead of keeping completed tests alive. The unchanged production/default boundary passed independently: ordinary default play made zero GLB requests, while production continued to exclude the development review routes/query flags. The full API contract passed separately; no static preview was substituted.

## Owner/device review and next work

Review the original normal/near-normal camera captures, not only the authored source or scale fixture. Current small-scale dark armor can still converge with other melee figures; city occlusion and side/back angles remain review concerns. No screenshot pixels are retouched, and no automatic metric is treated as visual acceptance.

Physical iPhone loading, memory, thermal behavior and sustained frame rate remain tester gates. Once the pilot's role distinction is reviewed, extend missing classes with tribe-specific sources—not recolors of this one model. Keep procedural defaults and fallback until separately approved.
