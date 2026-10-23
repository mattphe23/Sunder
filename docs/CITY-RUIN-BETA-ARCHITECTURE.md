# Opt-in city and ruin architecture — 23 October 2026

## What changes

The existing **Landscape improvements (beta)** setting now includes fresh city and ruin architecture. Cities are compact warm-stone settlements with dark roofs, a clear central muster court, peripheral growth, a civic beacon on capitals from level one, and distinct defensive walls. Unclaimed villages retain a smaller three-building hamlet silhouette. Ordinary ruins are fractured oathgates; great ruins are larger weathered conduits with restrained old-gold inlays and amber relics. Their tall portions are statically placed behind the garrison at Sunder's normal camera orientation.

This is a new default-off beta design pass, not final owner aesthetic acceptance or completed tribe-specific city architecture. The models of Warrior, Maelis and the rest of the roster are unchanged; the successful occupied-forest transitions are untouched.

## Controls and boundaries

On the menu, or in the in-game paintbrush **Visual settings** dialog, enable **Landscape improvements (beta)** to see these structures. **New visuals (beta)** remains an independent character choice. Both default off. Turning landscape off restores the exact existing city/ruin branch during the same match. No purchase, unlock, balance, reward, movement, fog rule, map-generation, save-format or game-state changes are made.

Existing strict development visual-review gates remain intact. Production query parameters do not enable either beta setting. Original imported model provenance and review-candidate decisions are unchanged. No new GLB, external image, texture, light, particle or animation asset is needed by the architecture pass; all city/ruin geometry is constructed by the existing Babylon renderer.

## Engineering implementation

Separate `cityArchitecture.ts` and `ruinArchitecture.ts` modules use renderer-owned cached materials. Returned meshes enter the established per-tile fog wash, material batching, picking metadata, static freeze and disposal paths. They do not install observers or create geometry every frame. Unit movement does not add occupancy to the static board fingerprint and therefore does not force a whole-board rebuild.

The city's plan caps growth to five visual rungs and at most 46 pre-batch pieces. City materials use at most seven cached families; ruins use six. Tests cover deterministic plans, actual Babylon mesh bounds, central clearance, capital/village/wall distinctions, material reuse and disposal. Ruin triangles remain within 200 standard / 220 great test ceilings (measured original plan 184 / 200; rear orientation does not change topology).

## Completed validation

- TypeScript no-emit: pass.
- Full Vitest regression: **55 files / 427 tests pass** after the starting-capital and rear-ruin corrections.
- Bounded-heap production build: pass.
- Clear, disclosed development engineering fixtures: **26 original-pixel phone captures**, including actual ready managed beta Warrior and Maelis r2 meshes in cities, the unchanged procedural guardian at a great ruin, level 1/3/5 settlements, capital, village, defensive walls and both nearby orbit directions.
- Fog fixtures: seen-but-out-of-live-vision city is washed/dimmed (`visibility=0.6`, fog material); unexplored architecture is hidden; the visible view is restored. These are explicitly controlled fixture states, not played matches.
- Actual ordinary production UI cases: default unflagged Auren match makes **zero candidate GLB requests** and uses `default-legacy` architecture with no imported cache. The native-simulated opt-in match loads actual ready beta Warrior and separately audited Maelis r2 from their canonical managed paths. No page or console errors occurred.
- In the ordinary production match, landscape off, landscape on again, character opt-out and reload/public CONTINUE resume each preserve the saved match **byte-for-byte**. Save snapshots were 24,413 characters in this measured case; no save data is committed to Git.
- Two loaded imported templates used **8,388,600 estimated decoded texture bytes** against the unchanged **67,108,864-byte / 16-model cache ceiling**, with zero failed/queued/active loads after settling. This is cache telemetry for characters, not native total RAM or an architecture memory measurement.
- Prior worker fixture picks returned correct batched tile metadata. Its ten forced rebuild samples plateaued at 1,702 meshes / 129 materials / 243 decor meshes. These are disclosed fixture counts, not a production board maximum.

The final ordinary test attempted End Turn but did not complete an advancement within its bounded wait. **No fresh three-turn claim is made for this architecture closure.** Reload/resume and all visual-toggle checks did complete. Previous build-117 save/turn work is separate evidence.

Final unchanged production/default review-boundary controls and the full API contract passed against the final Express production bundle. The independent closure reviewer found no concrete blocker for this default-off beta scope. Main source is byte-identical to that reviewed candidate, its TypeScript check passed, and all 13 built web files copied to the iOS bundle match byte-for-byte. These results are not inferred from a standalone Vite rendering preview. Source-only publication triggers the owner-enabled automatic TestFlight workflow; its upload outcome and Apple processing remain separate delivery events.

## Visual limitations and next tester checks

Courtyard geometry improves garrison visibility; it does not solve every neighboring tree/mountain occlusion or every arbitrary camera orbit. The static rear-set ruin can come forward if the player rotates behind it. The current cities intentionally trade towering silhouettes for unit readability; growth is modest and may need stronger level cues after owner review. Standard/great ruin distinction is clearer through scale and inlays but remains a beta art judgment. Neutral village and walls were reviewed in unobscured fixtures, not a comprehensive all-tribe visual acceptance exercise.

For TestFlight, enable landscape, inspect your capital with Warrior and Maelis, compare a village and walled town, find a normal/great ruin, rotate the camera, then turn landscape off and resume the match. Report readability and interaction issues. Physical iPhone/WKWebView memory, frame time, thermal behavior and crash-free duration still need device testing; Chromium software WebGL cannot prove these.

No public App Store release, default art promotion, or complete launch readiness is claimed.
