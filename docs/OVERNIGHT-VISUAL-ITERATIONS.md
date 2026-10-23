# Sunder overnight visual iterations — 23 October 2026

## Scope and decision boundary

Two environment worker/reviewer cycles and a separately audited Maelis revision build on source `436153a` (build-116 context). These are engineering candidates for the existing explicit beta settings, not default visual replacements, owner aesthetic approval or full release readiness. Both settings remain off for a fresh installation; procedural visuals remain the default and model-failure fallback.

The eight actual designed tribes are Auren, Kharzul, Sunwei, Vessari, Nerivane, Dravok, Valkyra and Mycelon. Their read-only squad audits favor preserving the current tribe identities and strong role concepts, while prioritizing large silhouette/value separation and commander hierarchy over more micro-detail. The initial stale Skael item was held rather than fabricated, then corrected by a dedicated Vessari audit. No ninth tribe or extra modeled role was invented. Borvak contrast remains the separately deferred issue.

## Dynamic forest readability

With **Landscape improvements (beta)** enabled, empty forests retain full authored arrangements. A currently drawable unit entering a forest triggers a short, local transition to smaller outer trees and a taller edge tree. Departure restores the authored arrangement. The tile remains forest for all rules, movement, defense, resources, fog, city interaction and saves.

The renderer retargets only per-tile forest roots; occupancy no longer invalidates the static-world signature. The original default-off batching/geometry is unchanged. Conifer, pine, palm and acacia use the same bounded approach.

Two review cycles passed legal forest enter/undo-departure restoration, normal phone and plus/minus 0.55-radian camera checks, beta-off disposal and save invariance. Cycle 2 additionally passed actual canvas forest/city picking for a city-adjacent board-edge forest: continents seed 6104, city (9,7), destination (10,6). Failed initial harness attempts were preserved and resolved through normal onboarding/panel dismissal, canvas-relative click delivery and correct void-return interpretation—not product-gate relaxation.

Live ordinary-rival movement out of the human-visible area has not yet been observed in runtime. Source tests retain hidden-rival/no-leak and restoration invariants; those tests are not relabeled as live fog-transition evidence.

## Maelis r2: new model, immutable provenance

A separately authored shoulder-and-mantle source was submitted once through the main built-in P2 route. The earlier character worker's blocked catalog scaffolding was not shipped. The completed output and runtime derivative have independent integrity evidence; original Maelis v1 and the original 46-model derivative map remain unchanged.

| Record | Value |
| --- | --- |
| Revision | `auren-maelis-shoulder-mantle-r2` |
| Provider/model | `image/P2-20260801`, requested face limit 5,000, texture/PBR enabled |
| Provider job | `job_m_b47c17d928167d232bf3` |
| Audited geometry | 6,084 vertices; 4,013 triangles; one runtime primitive/material |
| Immutable original bytes | 3,089,472 |
| Runtime derivative bytes | 686,164 |
| Runtime texture constraint | Three embedded textures, each at most 512px |
| Estimated template textures including mipmaps | 4,194,306 bytes; not total native RAM |
| Original SHA-256 | `933cb418d47fb7dfe6d81bc31898485f267fd97cd4db618010f14a2418c017f6` |
| Derivative SHA-256 | `d984fda7e841e7e31180400fafd7f413473ce07bfe6925157a3aee4e90cdc2a6` |
| Original managed path, provenance only | `/manus-storage/auren-maelis-shoulder-mantle-r2-p2_bc1b24cd.glb` |
| Runtime managed path | `/manus-storage/auren-maelis-shoulder-mantle-r2-p2-beta-512_fc894858.glb` |
| Decision | `review-candidate`, not owner aesthetic approval |

The derivative process only downsizes/re-encodes embedded textures. Geometry, accessor data, materials, nodes and non-texture buffer contents were independently checked unchanged relative to this new immutable original. The new geometry is not attributed to the old Scenario asset: the separate record preserves the superseded original path and identifies the new provider job/model/hash.

The revised selector runs only after explicit **New visuals (beta)** opt-in and the existing real-hero/tribe/costume eligibility checks. Only Auren's Maelis slot uses the revision. Warriors, other tribes, rejected studies, boats, guardians, unmodeled roles and custom costumes retain existing selection/fallback behavior. The development review gate and original catalog are untouched.

Native/web texture admission now accepts exact audited derivative paths or the exact allow-listed public storage origin plus those paths. Original 2048px models, unknown assets, arbitrary hosts, query variants and prefix/traversal strings have no admission entry. Existing 64 MiB imported-template texture, 16-template, two-active-load and 15-second timeout ceilings are unchanged.

## Genuine runtime evidence and judgment

A matching seeded actual GameStore phone game validated old and revised Maelis decode, native-public-proxy delivery, legal forest movement, normal/rear and plus/minus orbit views, and opt-out restoring procedural geometry with identical match and save bytes. The seeded Auren sample had two loaded templates/two clones, no failed models or active/queued loads, and **8,388,600 measured decoded template-texture bytes** for warrior plus commander. No immutable original was requested by runtime.

The dedicated scale fixture measures projected visible-mesh bounding boxes in CSS coordinates, not recognition pixels or physical-device performance. Its camera capped at radius 30: the original group measured approximately 41.8 CSS px and r2 approximately 45.0 CSS px. Therefore it is a near-40px engineering fixture, **not an exact 40px pass or proof of role recognition**. Earlier framebuffer-only/uncorrected attempts are retained as superseded evidence.

The revision presents a broader cape/shoulder mass, but remains dark from rear/oblique views. The ground sigil and nearby foliage still compete strongly with the figure. This is a useful reversible beta candidate, not a claim that commander readability is finished. A distinct follow-up worker/review scope addresses the oversized selection effect and overlay-resource ownership without repainting models or changing rules.

## Selection hierarchy and overlay ownership

Two additional writer/QA/reviewer cycles reduced the existing ground sigil only under either explicit beta display opt-in: intrinsic width is 0.68 of the legacy value and material alpha is 0.55. The both-off path retains exact legacy size/alpha. Existing fissures, selected-tile rim, reachable/attack cues and picking metadata remain unchanged.

The resource auditor verified an existing leak: selection/planner meshes were destroyed without disposing their exclusively owned StandardMaterials, and planner labels created uncached DynamicTextures. The final source owns and disposes only those overlay materials and planner-label textures after their meshes. Cached sigil textures and shared board/imported resources are not forcibly disposed.

The second independent review correctly held acceptance because its interaction harness had not proved cleanup. The coordinator closed the gaps without altering product gates: wait beyond Babylon's documented 300ms double-tap window for each POINTERTAP, use the actual lowercase accessible city-planner name, settle model loading before the resource baseline, and distinguish the ground `sigilm` material from small same-named character chest emblems.

Actual canvas selection/deselection completed **100 confirmed cleanup cycles**, and ordinary Planner completed **100 confirmed open/close cycles**. Both had zero owned-resource growth and zero global texture additions/removals from settled baselines. The previously unexplained extra texture was Babylon's cached `data:EnvironmentBRDFTexture0`, not an uncollected planner label. A planner label was present while open and absent after close. Eight actual-renderer NullEngine regressions additionally cover 100 cycles per mode, planner labels and shared-texture protection; these are bookkeeping tests, not GPU/visual proof.

A genuine matched seeded comparison used the same GLB, seed, units, explicit preferences and fixed camera in baseline and candidate. Ground-sigil intrinsic widths measured **1.428 versus 0.97104 world units**, with alpha **1 versus 0.55**. Selected/reachable/attack cues and legal attack staging/cancellation remained present without changing the save. The comparison is a disclosed GameStore engineering fixture, not an ordinary-production attack or default-camera acceptance claim.

City geometry still obscures garrisoned figures from some angles in the matched captures. The compact effect does not fix that pre-existing occlusion; city/unit clearance is a next landscape priority. Neither this patch nor the new Maelis model is visual finality.

## Coordinator release checks

- Combined TypeScript check: passed.
- Final full regression suite including overlay ownership: **53 files / 414 tests passed**.
- Independently reviewed forest production build/API/normal-production checks: passed.
- Reviewer native bundle copy: 13 production files copied byte-identically; no generated tracked-file drift.
- Combined forest/Maelis ordinary-production rerun: four cases passed, including actual revised-Maelis attachment, default zero GLBs, blocked fallback, late-response opt-out, four-player cache ceilings and byte-identical saves. The first attempt falsely required exactly two templates; a legitimately visible rival added a third audited model. The corrected assertion retains the budget cap, rejects failed decodes and explicitly requires revised Maelis ready.
- Final integrated bounded-heap production build, API JSON contract, four fresh ordinary-production cases and 13-file byte-identical iOS copy: passed.
- Unchanged final default/review-boundary negative controls passed at 390px and 375px: legacy visual query flags ignored, zero GLBs/default preview nodes/native checkout calls, setup/research controls reachable, three turns and save/resume preserved, internal review/lab routes unavailable.
- GitHub-first publication, checkpoint and automatic TestFlight status are coordinator-owned subsequent steps; source/software evidence alone is not an uploaded or Apple-distributed build.

Only source, tests and documentation may be committed. Source art, GLBs, derivatives, screenshots, native generated binaries and external harnesses stay outside Git and `client/public`. GitHub is authoritative; push is fast-forward only after validation, then checkpoint and reconcile equal trees. The existing owner-enabled main workflow may automatically create a TestFlight upload; do not launch a duplicate manual upload.

## Tester/device gate

After Apple processing and internal distribution, test the update on physical iPhone: start-menu scroll and top HUD safe area; first model load and offline fallback; ordinary movement/selection/combat; enter/leave forest; beta on/off without save changes; several turns/resume; frame stability, heat and memory pressure. No private Chromium or software texture estimate substitutes for that hardware gate. Public App Store release and default promotion are not part of this rollout.
