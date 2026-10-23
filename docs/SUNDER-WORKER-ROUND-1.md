# Sunder worker round 1 — engineering handoff

## Team result

The three bounded workers completed their first assignments on build-112 source (`7b4edba`). They are project workers, not saved Cue profiles or always-on agents. The gameplay analyst was not launched. The coordinator retained sole integration/release ownership.

### QA and stability

Two fresh ordinary UI matches exercised default-off model requests, character/landscape opt-in and rapid opt-out, save-byte invariance, end turn, ordinary Continue/resume, short-phone modal scrolling and deliberately unavailable GLBs. The tested regressions were not reproduced; the failure case established control/save continuity, not a pixel-level mesh identity guarantee.

QA found a validation topology gap: standalone `vite preview` returns SPA HTML for `/api/trpc/auth.me`. The full API-serving production process and deployed Sunder site both return the expected JSON. This is not evidence of a TestFlight defect. `scripts/check-production-api-contract.mjs` requires an explicit full-runtime target, checks anonymous API JSON without logging response contents, and rejects static-preview targets. The proposed Linux CI step was tested locally, but the GitHub connection cannot update workflow files. The owner can add the retained step after Build web; until then the check is manual, not an automatic CI gate. No workflow change was pushed; existing TestFlight automation and public-release policy are unchanged.

### Auren Maelis

The worker identified authored silhouette/albedo contrast as the principal cause of poor commander readability. A narrowed, dark Maelis body is not a Maelis-only normal/shadow/loader failure. No global lighting workaround, GLB modification or character replacement was integrated. The warrior is unchanged. The separately retained revision brief proposes a distinctive taller crown, broader shoulder/cape mass and a large mid-value contrast region, to be generated/audited/reviewed later. See `AUREN-MAELIS-READABILITY-REVISION.md`.

### Optional landscape

The accepted engineering candidate changes only world-v3/beta-landscape forest grouping: up to three already-budgeted trees use deterministic outer-corner positions and smaller scale, leaving a stable actor center lane. It does not consult unit occupancy, ownership or visibility. Procedural/default landscape remains unchanged; city decoration, mountains, coasts, seams and distant mist were not redesigned.

Parent-controlled genuine captures used the same seed, legal Maelis move onto forest, selected unit and locked camera before/after. Archipelago phone/desktop pairs and a conifer continents phone pair had two imported actors ready, unchanged save bytes and intact opaque fog. The captures show improved center clearance; smaller trees also reduce perceived forest density. This is an optional candidate, not owner aesthetic approval, and it does not fix Maelis's authored silhouette.

## Validation and evidence

Worker-focused typechecks/tests passed. Coordinator TypeScript, all 50 test files / 395 tests, production build, native bundle copy, workflow YAML parsing and local execution of the new API gate passed. The gate also passed with no private API/signing credentials, using only the existing CI Stripe placeholder. Unchanged production/default review-boundary controls and both final ordinary-game production cases passed against the full API-serving server. The normal case had zero page/API console errors; the deliberately blocked-model case had only expected blocked-request console messages and zero page errors. All GLBs, masters, textures, screenshots, internal job records and browser harnesses remain outside Git under `/home/ubuntu/sunder-team/round-1/`. Existing provenance, audited 512px derivatives, model budgets, dev review gates and procedural fallbacks are unchanged.

Evidence includes `environment/parent-render/results.json` (archipelago pairs) and `environment/parent-render/continents-1792717591086/results.json` (conifer pair). The first highlands seed had no legal forest move and is not claimed as a passed visual case. The first development comparison failed because shared Vite dependency caches exposed missing chunks; temporary review servers were isolated with separate caches and a real API proxy, then stopped. Worktrees sharing node_modules must not share Vite caches for concurrent preview servers.

## Remaining acceptance

Physical iPhone/WKWebView inset reporting, hardware memory/FPS/thermal behavior, authenticated cloud/store paths, city-decoration clearance, overall forest density and the future Maelis variant remain separate review/testing work. Source validation and automatic TestFlight upload do not establish those outcomes. Both visual settings stay explicit, reversible and default off. App Store public release remains manual.
