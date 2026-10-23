# Ruin support repair and neutral Guardian beta follow-up

## Scope

The owner's phone captures exposed unsupported stones in the new beta ruin architecture and a legacy neutral unit beneath a Great Ruin. The battle preview called that unit Swordsman because it uses the canonical Swordsman combat class. It is the neutral Guardian, not a trained Vessari Swordsman. This pass fixes the visible support chain and introduces one separately audited neutral Guardian candidate through the existing explicit New visuals preference. Ordinary Swordsman, Knight, Catapult and Colossus remain separate art-coverage work; the 46-model starter roster was not all gameplay classes.

Procedural visuals remain default and fallback. Only the landscape-beta ruin geometry changes; the old architecture branch is preserved. Rules, rewards, exploration, movement, fog, combat stats, saves and balance are untouched. The battle preview uses a display-only Guardian label for the flagged neutral actor while ordinary Swordsmen keep their names.

## Ruin repair

The great ruin's right shoulder now contacts its support. The standard ruin gains a single tilted, weathered right link-cap (12 triangles). The ancient fracture, unequal lintels and offset keystone remain; this is a support repair, not a pristine doorway redesign. Budgets are 196 triangles for the standard ruin and 200 for the great ruin. The rear positive-Z composition, central ±0.2 clearance, ±0.47 bounds, material limit and tile-pick metadata remain unchanged.

A Babylon transformed triangle-surface distance regression verifies retained support chains at ≤0.005 world units. It replaces a loose closest-vertex proxy that could miss a visible gap. Ten focused ruin tests passed. Matched original phone fixtures were captured at normal and close left/right camera angles and reviewed without image modification.

## Neutral Guardian asset provenance

The generated source image and immutable original model are outside Git and `client/public`. The P2 generation produced 3,677 vertices, 4,806 triangles, one primitive/material, and a 3,435,992-byte original GLB. A separately audited 512px-max embedded-texture derivative is 648,572 bytes. The audit preserves geometry, non-image buffer bytes and material/image reference semantics; only embedded texture storage is deterministically downscaled/reencoded.

- Generation: `job_m_5b962ab1fa3cab8d7397`, `image/P2-20260801`, requested 5,000 faces.
- Original managed path: `/manus-storage/neutral-oathguardian-v1-p2_6ac754ce.glb` (provenance, never a gameplay substitute).
- Beta derivative: `/manus-storage/neutral-oathguardian-v1-beta-512_68426439.glb`.
- Source image SHA-256: `e75d55402167394ffa79ac2f242396086f001cc92622cbb380dd14a16adbf350`.
- Original model SHA-256: `364a1e9f492956cd2cbfb24545c415679db122af20276bf90b3663b6694f4f84`.
- Derivative SHA-256: `48d51718043fffef40166727ae5a935378a9dc19d98728c9681bfd51a27bc92a`.

`betaWorldVisuals.ts` admits only flagged neutral (`tribe=-1`) Guardian Swordsmen with New visuals enabled, excluding boats, heroes, raiders and ordinary faction Swordsmen. The original faction roster registry and strict development-review exclusions are unchanged. Existing native-safe storage resolution and the shared cache's 64 MiB / 16-template / two-load / 15-second constraints apply. No catalog preloading or arbitrary URL admission is added.

The existing amber dormant / red awake cue remains. On successful import it becomes a small non-pickable overhead beacon; failed imports retain the old body and original eye treatment. This is a static imported model with the renderer's existing movement placement, not new skeletal animation or a gameplay change.

## Measured engineering evidence

A disclosed genuine Babylon development fixture passed default-off zero requests, two independent Guardian actors sharing one template/request, successful texture/model decode, live awakening, hide/restore under unexplored fog, blocked-GLB procedural fallback, and visual-toggle rollback. Neither preference changes nor model attachment changed the fixture state or local save. Two clones measured 4,194,300 decoded texture bytes total with one loaded template, zero active/queued loads, and the unchanged 67,108,864-byte ceiling. The audited conservative estimate is 4,194,306 bytes per template. These are not total native RAM measurements.

Early screenshots taken at the import-ready event preceded asynchronous PBR shader readiness; they were retained as superseded evidence. Final captures explicitly wait for material readiness and render. Both a seen-but-fogged landmark fixture and a separate live-vision fixture were preserved. Phone screenshots do not constitute physical-device performance approval.

Focused source validation passed TypeScript, 31 selected tests and diff whitespace checks. A separate gameplay-lane investigation then confirmed and fixed a neutral camp-raider destination collision with one application-time occupancy guard and four actual-GameStore regressions. All 16 original gameplay seeds replayed without invariant failures; all eight focused regression groups passed. The final full suite passed 453 tests, production was rebuilt, and all 13 iOS web-bundle files matched byte-for-byte. Final production/default and UI-playtester checks are recorded before publication; no upload is claimed from these local results alone.

The final rebuilt full-production API contract and unchanged default/review-boundary controls passed. Two ordinary phone-sized UI matches completed real movement, city inspection, three turns and save/reload; the beta match also verified a fruit harvest. The default seed's unavailable eligible harvest remains an explicit coverage warning, not an erased test. Neither match recorded a true runtime-error finding. Default mode made zero canonical GLB requests. These controls do not establish physical-device RAM, full roster coverage or aesthetic approval.

## Release and review limits

The Guardian remains a review candidate. The owner liked the source direction; that does not approve every in-game scale, camera view or texture result. Dense-board and approximately-40px readability, physical iPhone RAM/frame time, and the unmodeled advanced faction roles remain follow-up work. No public App Store release is performed. A validated GitHub main push may trigger the existing owner-enabled automatic TestFlight pipeline; Apple processing/distribution remains separate.
