# Kharzul Berserker — Scenario P2 first-pass review candidate

**Decision: `review-candidate`; not owner-approved and not enabled in ordinary gameplay.** The imported model is available only through explicit development review routes. The default Berserker remains procedural. Other specialist and hero first passes, landscape cleanup, and TestFlight are separate pending work.

## Provenance

- Untouched original `cross-tribe/kharzul/kharzul-berserker-source.png` outside Git: 1024×1024, 680,972 bytes, SHA-256 `386ad0a4cfdfa192a7c54a0b0803473139d16df07f540bdbcc4d0c3089a1994b`. This is a short, broad masked dual-axe infantry unit with crimson crest, muted green chest pendant, ragged red waistcloth, wide stance and orange fissure in a fractured gray plinth—not a mount. A reproducible repair of only disconnected edge fragments produced the 1024² reference `kharzul-berserker-source-edge-repaired-v3.png`, 645,919 bytes, SHA-256 `9ff147e823af23263e2f8d216fd4f18b5fe36cb1b62aa943bcdad7450d2e7213`, with the central figure bit-identical. Earlier v1/v2 repair studies were rejected for residual fragments and inpainting ghosts. Locked source-faithful turnaround prompt SHA-256 `dd7e891f73ea7af3c2c62c801aed5c0a2c1a3b541dcf263da3ca965aa80e98b4`.
- Exactly one 18-CU [Sunburst job `job_wYsovBtXMdC6fPU2SmjGeQ6A`](https://app.scenario.com/create?restartGeneration=job_wYsovBtXMdC6fPU2SmjGeQ6A) used durable source `asset_hiGRhp6EeWw1iM32jjdh8rVR`, one 3840×2160 canvas, Auto quality/background and the exact locked prompt. It produced [image asset `asset_5bG9ivss7hc4n6YHrLF4fb9b`](https://app.scenario.com/assets?openAssetId=asset_5bG9ivss7hc4n6YHrLF4fb9b), archived unchanged outside Git: 7,693,722 bytes, SHA-256 `3d47171d0d4537b5882584c24e2914ace636cd2268ea183c4973cf5fb1e3ce73`. The native sheet supplied four genuinely different views. Initial equal-width crops were **rejected** because Front clipped an axe and Left included a neighboring blade. Measured blank seams at x=1080/1903/2882 yielded four independent, unstretched 1024² corrected crops; front axes and complete bases were rechecked in each view.
- Exactly one 220-CU non-Quad [Tripo P2 job `job_WnuefscmSGo9XUeRtLEQw5yG`](https://app.scenario.com/create?restartGeneration=job_WnuefscmSGo9XUeRtLEQw5yG) produced [3D asset `asset_Dq81oqMB2WMgcBSVTHS77qVT`](https://app.scenario.com/assets?openAssetId=asset_Dq81oqMB2WMgcBSVTHS77qVT), seed `1673879871`. Independent durable corrected inputs were Front `asset_ZfLaN8yFDNM8Xcq4ic2KkqNf`, Left `asset_G2bmCL26tnFsRM1ZEUgrKJ54`, Back `asset_fYt9jNp1wnFGVhLvsqWGA8rL` and Right `asset_yqfej8by6jwuwZDAAi7pHVXc`. Texture/PBR/Delight on, Auto Size/Quad off, Standard, Original Image, default orientation/version, and blank seed/face limit. No duplicate generation or 230-CU Quad run.
- Exact original binary archived outside Git at `cross-tribe/kharzul/berserker/model/kharzul-berserker-tripo-p2-v1.glb`: 3,623,140 bytes, SHA-256 `5a938dacaaf2048e31fd74cf9c944ef460233983f57b35c13e2207d822a251e5`. Signed exact-asset Scenario resource passed binary MIME type, byte-length and glTF integrity checks. Managed runtime path `/manus-storage/kharzul-berserker-tripo-p2-v1_dac5bf8a.glb` returned HTTP 307 in local and public previews. No binary media was placed in Git or `client/public`.

## Read-only GLB audit

| Measure | Audited value | Pilot limit |
|---|---:|---:|
| Vertices | 7,036 | Informational |
| Triangles | 4,596 | ≤10,000 |
| Runtime primitives | 1 | ≤8 |
| Source bytes | 3,623,140 | ≤5,242,880 |
| Materials / embedded textures | 1 / 3 | Informational |
| Texture dimensions | 2048×2048 each | ≤2048×2048 |

All four mobile gates passed. No mesh or texture retouching was performed. Rear geometry is a conservative generated continuation, not an original-source photograph.

## Actual visual review and isolation

- [Query-gated Babylon Model Lab](https://polyclone-n6b64njm.manus.space/model-lab?tribe=1#kharzul-berserker-comparison): `cross-tribe/kharzul/berserker/review/kharzul-berserker-procedural-vs-p2.png` contains **24 authentic Babylon-rendered portraits**: full-size procedural/P2, 40px color/grayscale, eight rotations and occupied hexes. The imported model retains a tall two-point crimson crest, broad stance, axe, red waistcloth and orange fractured-base fissure. Against the large red procedural Berserker, it is markedly smaller, gray-heavy and less saturated; at 40px/grayscale the raised twin-axe identity becomes much weaker, and in some angles one axe is obscured by the body. This is a future contrast/silhouette review risk, not an aesthetic approval or a reason to interrupt roster breadth.
- [Opt-in Babylon board](https://polyclone-n6b64njm.manus.space/?devgame=6105,11,1,highlands&p2-candidate=kharzul-berserker): actual Kharzul game (tribe 1), Berserker preview node `u3` at `(2,9)`, procedural hero retained and zero page errors. The real screenshot `cross-tribe/kharzul/berserker/review/kharzul-berserker-live-board.png` shows the candidate clearly on a ground tile next to its city, with the much larger red procedural hero and gray mountains as a contrast reference. An initial seed-6104 board partly hid the smaller candidate behind city geometry; the unobstructed seed 6105 is the recorded board evidence.
- An **unflagged** Kharzul game at the same seed retained **one canonical hero, zero imported candidate GLB requests, zero preview nodes and zero page errors**. The imported unit is opt-in/query-gated only.

## Validation

- Original/crop QA, GLB mobile audit, local/public storage redirects, `pnpm check`, **42 focused registry tests**, authentic Babylon 24-portrait and board identity, same-seed unflagged negative control, and `git diff --check` passed. The **full suite passed: 290 tests in 35 files**. The bounded-memory client/server production build (`NODE_OPTIONS='--max-old-space-size=2048' pnpm build`) completed successfully with only large-chunk warnings. This tested first-pass integration does **not** imply owner aesthetic approval or default replacement.
