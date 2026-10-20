# Sunder: submission, tester invitations and visual rollout

The next useful release step is a small internal TestFlight installation, not a public App Store submission. GitHub confirms that the signed engineering build **1.0 (104)** uploaded successfully from commit `c88b2d131c5d234749e5f38cab4048a25a3aa67a`. That does not establish Apple's processing state, compliance clearance or a successful launch on an iPhone. Build 104 uses the existing procedural visuals in ordinary gameplay and hides native iOS web checkout. The reviewed character models and world-v3 landscape are not default visuals. An overnight audit found a legacy query-preview escape; closing it in source does not change the already-uploaded build 104.

Prepared by Manus AI, 20 October 2026. This is a first-pass preparation document. No new Apple build, review submission, invitation, public beta link or default-art change was made for this work.

## Get build 104 onto an internal tester's iPhone

In App Store Connect, open the app's TestFlight tab and inspect build 104. Verify that processing has finished and review any warning or Missing Compliance message. Answer export questions from the app's actual encryption behavior, not from the fact that signing credentials exist. Apple documents build processing separately from beta export compliance.[1] [2]

Create a small internal group, suggested name **Sunder — Engineering Smoke**, and add build 104 manually. Start with the owner. Existing App Store Connect users with eligible roles and app access can be internal testers, up to 100 users; an arbitrary Apple Account is not sufficient. Do not give friends App Store Connect access merely to bypass the external beta process. A tester accepts the invitation and installs through Apple's TestFlight app.[3]

The first physical-device check should record device model, iOS version and build number. Confirm a fresh launch; start a solo match; select and move a unit; end turns; open Research; background and reopen the app; force-close and Continue; and confirm that no web purchase controls appear. Try one launch and an existing local match in airplane mode. Audio, gestures, safe areas and WebGL memory behavior must be checked on real hardware. Browser emulation does not validate these WKWebView details.

The invitation action should wait for approval of the exact group and recipients. No email addresses or additional user roles are assumed in this document. Automatic distribution should stay off for the first controlled smoke check.

## Invite outside testers after the smoke install

External TestFlight is the appropriate route for friends who are not App Store Connect users. Apple supports up to 10,000 external testers per app. External groups require an internal group first; the first external build goes through TestFlight App Review before external testing can begin. This is beta review, not public App Store approval. Builds remain testable for up to 90 days.[4] [5]

Prepare Test Information: an accurate Beta App Description and a monitored feedback email, plus the review contact, access information and What to Test required by the selected flow. The feedback email is used as the invitation reply-to address. `support@islandroadco.com` appears in project documentation, but the owner still needs to confirm that it is monitored before using it.[6]

For the initial external cohort, use a named group and owner-approved email invitations. Do not enable a public link overnight. Public links can be forwarded, allow optional tester/device criteria and can conceal tester identity in the tester list. They are a later distribution choice, not a prerequisite for testing.[4]

### Draft beta copy for owner approval

**Beta App Description**

> Sunder is a turn-based strategy game set in the Shatterlands. Choose a faction, explore the map, grow your cities and challenge rival powers. This first TestFlight build is an engineering test of installation, core gameplay and local save restoration. It uses the current procedural visuals; the separate visual-upgrade studies are not included. It is not a final release.

**What to Test**

> Please test installation and a fresh launch, then play several turns of a solo match. Select and move a unit, open Research and end a turn. Background the app and reopen it; force-close it and use Continue. Try a local match in airplane mode. Report crashes, lost saves, stuck turns, unreadable controls or gesture problems. Include your iPhone model, iOS version, build number and reproduction steps. Screenshots or screen recordings are helpful. Purchases are unavailable in this iOS engineering build.

**Build 104 release notes**

> First signed iOS engineering smoke build. Please check launch, procedural gameplay, touch controls and save/resume behavior. Native iOS web checkout is hidden. This build does not include the separate imported-character or landscape review pilots.

These drafts describe only accessible features, consistent with Apple's requirement that metadata and screenshots reflect the actual app.[7]

## Prepare the eventual App Store submission

The App Store record exists, but its accepted display name was not confirmed in this task because the plain name “Sunder” was unavailable. Keep bundle ID `com.islandroadco.sunder` fixed. Confirm the final public display name rather than silently inventing a replacement.

Prepare an accurate subtitle, description, keywords, category and copyright. Turn-based strategy is a reasonable proposed category positioning, not an account change. Populate a real support URL and the privacy-policy URL. A working, maintained support page with contact information is required; a placeholder address or untested link is not enough.[8]

Inventory data collection before completing App Privacy. Solo local saves do not automatically make the app “no data collected”: the packaged page currently attempts an analytics request, and account/online features have separate data flows. A privacy manifest is implementation evidence, not a substitute for the App Store Connect disclosure. Describe actual first-party and third-party practices.[9]

Complete the current age-rating questionnaire from the finished content and features, including combat, messaging and any user-generated content. Do not assume a rating or make child-privacy legal conclusions from the game's visual style. Age rating is a required app-information step.[10]

Confirm export compliance from actual encryption use and dependencies. Provide a reachable review contact and reviewer notes explaining the offline base game, unavailable native purchasing and any login-dependent features. Supply non-expiring demo access if required, and make the relevant backend available. The smoke build is not yet evidence that every online/account feature works in its native wrapper.[2] [7] [8]

Capture real screenshots from the build selected for submission, at the device sizes currently required in App Store Connect. The Xcode target supports both iPhone and iPad, so iPad layout and screenshot obligations must be addressed rather than assumed away. Apple's live screenshot specifications are the source of truth. Do not submit title art alone, desktop comparison sheets, or images of upgraded art inaccessible in the submitted build.[11] [7]

After on-device testing and metadata/privacy decisions, choose a build and submit the version for App Review as a separate, explicitly approved action. Recommend manual release for the first version so approval does not automatically publish it before the owner is ready.[12] [13]

## Promote the improved landscape before imported characters

The lowest-risk next visual build is **world-v3 landscape first**. It is original procedural geometry and palette code, so it does not require Scenario jobs or remote GLB downloads. The visible-surface seam fix and irregular distant mist already exist. Owner feedback supports the direction, but production activation remains a separate engineering/product decision.

Do not simply remove every development gate or make a URL parameter enable all pilots. Add an explicit, versioned visual preset for a future internal build with the existing default as the fallback. Keep it presentation-only: no changes to map generation, fog knowledge, combat, economy, ownership or saved-game rules. Preserve the ability to disable the new terrain independently of characters. Compare the same map state across both renderers and verify fog occlusion, selection, occupied tiles and unit readability.

Check the terrain on a physical small iPhone and iPad, a large map and a later game with many units. Measure frame time and memory there; neither screenshots nor the per-mesh audit establishes mobile performance. If these checks pass, the owner can authorize the landscape preset for the next build. Build 104 itself will not change retroactively.

## Promote characters in a limited asset rollout

The character breadth-first review queue is complete, not the production conversion. The registry distinguishes owner-approved Nerivane **visual targets** from other tribes' `review-candidate` entries and rejected studies. That art-direction approval does not imply rigging, animation or native runtime readiness. Borvak's starker-color/40px contrast polish is deliberately deferred in GitHub issue #1.

Begin with a small, named set of approved targets rather than enabling every tribe and role at once. Keep stable tribe-definition/UnitType mappings, class silhouettes and existing combat/selection semantics. Retain canonical procedural fallback for absent, rejected or failed imports. The 40px color/grayscale, rotation and occupied-tile evidence should stay part of acceptance; individual attractive portraits are insufficient.

The pilot limits remain useful: no more than 10,000 triangles, 8 runtime primitives, 5 MiB source bytes or 2048-pixel embedded textures per asset. They are not a whole-roster memory budget. In particular, decoded textures cost more memory than compressed GLB file bytes. Measure multiple simultaneous units, cache reuse, scene disposal, background/foreground behavior and late-game loads before promotion.

A native offline strategy is still needed. `/manus-storage/` works through the web server's signed redirect, but it is not automatically a packaged asset or an offline cache in the Capacitor app. Choose between audited versioned native packaging and a deliberately implemented, integrity-checked download/cache route. Keep immutable original archives external; do not improvise by putting large binaries into `client/public`. Test cold start, unavailable network, partial download and rollback explicitly. Static/unrigged models also need an animation treatment that preserves gameplay readability.

Owner approvals should identify exact asset versions and roles. Use a future internal visual-test build, then expand only after on-device checks. The ordinary smoke-build baseline stays procedural until a separate release choice is made.

## Visual promotion for the product page

For marketing, lead with the real game's distinctive Shatterlands board, faceted faction identities and city-building choices rather than comparisons to Polytopia. A proposed screenshot story is: faction choice; exploration and conquest; city growth and Research; then a representative late-game board. Copy should explain the shown action, not promise unshipped graphics or purchasing.

Only take final product-page captures after choosing the actual visual preset for the submitted build. The current AI character comparison images are useful private design evidence, not proof of the App Store build's appearance. Do not create or publish promotional images that make the smoke build look like the separate review branch.

## Morning decisions

The owner needs to confirm build 104's Apple status and first installation result, the accepted app display name, the monitored feedback/support route and exact tester recipients. Privacy, age rating, review access and export questions need accountable answers before submission. A later, explicit decision can authorize a landscape-first internal visual build; imported-character promotion should follow its own limited runtime/offline gate.

## References

[1]: https://developer.apple.com/help/app-store-connect/manage-builds/view-builds-and-metadata/ "Apple: view builds and metadata"
[2]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds/ "Apple: beta export compliance"
[3]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/ "Apple: add internal testers"
[4]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ "Apple: invite external testers"
[5]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ "Apple: TestFlight overview"
[6]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/ "Apple: provide test information"
[7]: https://developer.apple.com/app-store/review/guidelines/ "Apple: App Review Guidelines"
[8]: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/ "Apple: platform version information"
[9]: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/ "Apple: manage App Privacy"
[10]: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/ "Apple: set an age rating"
[11]: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/ "Apple: screenshot specifications"
[12]: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/ "Apple: submit an app"
[13]: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/ "Apple: select an App Store release option"
