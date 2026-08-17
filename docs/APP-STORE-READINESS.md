# App Store readiness

Audit of the shipping build against the [App Review
Guidelines](https://developer.apple.com/app-store/review/guidelines/), run
2026-08-17 ahead of Apple Developer enrolment. Every claim below was checked
against the code, not assumed.

Three things were hard blockers. All three are fixed. What remains is a
monetization decision that only you can make, and a short list of things that
can only be done inside App Store Connect.

---

## 1. Do these at enrolment, tomorrow

Two of these have long lead times and gate everything after them. Start them
first, before the fun parts.

### Individual or Organization — decide before you pay

This is the one choice that is genuinely painful to reverse: an Individual
account cannot be converted to an Organization, and moving apps between
accounts later means an app transfer with its own conditions.

| | Individual | Organization |
|---|---|---|
| Seller name on the store | **your full legal name** | your entity's name |
| Needs a D-U-N-S number | no | yes — obtaining one takes days |
| Extra team members | no, credential sharing only | yes, proper roles |
| Time to enrol | usually fast | slower; identity verification |

The trade is real: Individual publishes Sunder under your personal legal name,
visible on every App Store listing forever. If "Sunder" is meant to read as a
studio rather than a person, that argues for Organization — but a D-U-N-S
number is a multi-day errand and will delay the first TestFlight build.

**Suggestion:** if you already have any legal entity, enrol as that. If you do
not, enrol Individual now to unblock TestFlight, and treat a studio entity as a
later, deliberate migration. Do not create an entity at midnight to save face on
a seller name.

### Sign the Paid Applications Agreement immediately

Even if you have not decided on monetization. In App Store Connect →
Agreements, Tax, and Banking: accept the Paid Apps agreement, then complete the
banking and **tax** forms.

The agreement itself activates in about a day, but tax form processing is the
long pole and can run far longer. Until it clears you cannot sell anything —
not IAP, not a paid app. Starting it tomorrow costs ten minutes and removes a
dependency you would otherwise discover weeks from now.

### Register the bundle ID exactly

`com.sunder.livingforge` — from `capacitor.config.ts`. The CI pipeline reads
the bundle id back out of the provisioning profile, so a mismatch here fails the
signed build rather than silently producing the wrong app.

### Then the seven repo secrets

`.github/workflows/ios.yml` expects, and the `testflight` job checks all seven
are present before it does anything:

```
APPLE_TEAM_ID              IOS_DIST_CERT_P12          IOS_DIST_CERT_PASSWORD
IOS_PROVISIONING_PROFILE   APP_STORE_CONNECT_KEY_ID   APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_KEY_P8
```

See `docs/IOS-CI-SETUP.md` for where each one comes from.

---

## 2. Blockers found — fixed

### Account deletion — Guideline 5.1.1(v) · was a certain rejection

> "If your app supports account creation, you must also offer account deletion
> within the app."

Sunder creates an account on OAuth sign-in and had no deletion path at all. Not
a support email — Apple requires it *in the app*.

Shipped: `db.deleteAccount()` plus `auth.deleteAccount`, surfaced in the
Commander's Record and on the store page. Owned rows (profile, leaderboard
entries, entitlements, purchases) are deleted; rows shared with a second player
(async matches and their turn snapshots) are anonymised to a tombstone id,
because deleting the leaver's row would destroy a stranger's game.

The coverage test found a table nobody had wired up —
`playtest_runs.requestedByUserId` — on its first run. It fails whenever a new
user-linked column appears without a recorded decision.

### Restore purchases — Guideline 3.1.1

Unlocks are server-held, so signing in already restored them. But a mechanism
with no button is not one a reviewer can find, and a returning player has no way
to know. Added to both the Commander's Record and the store page.

### Privacy policy — Guideline 5.1.1(i)

There was none, and the App Store Connect field cannot be left empty. New
`/privacy` route, written against what the code actually does.

**Two things you must set before submitting:**

1. The `CONTACT` constant in `client/src/pages/Privacy.tsx` is
   `support@example.com`. Apple requires a working contact, and a policy with a
   dead address is worse than no policy. Decide what address you are willing to
   publish — a personal inbox on a public listing attracts what you would
   expect.
2. The text does not attempt to cover COPPA. If the age rating lands at 4+, or
   you submit to the Kids Category, that brings obligations this policy does not
   address.

### Privacy manifest and export compliance

`ios/App/App/PrivacyInfo.xcprivacy` declares five collected data types, all
linked to the user, none used for tracking. Capacitor ships a manifest for its
own framework that declares nothing — correct for the framework, wrong for the
app, since everything Sunder collects goes through its own server.

Registered in `project.pbxproj` including the **Resources build phase** — without
that the file sits in the repo and never reaches the bundle, which is the quiet
way this gets shipped wrong.

`ITSAppUsesNonExemptEncryption=false` in `Info.plist` so App Store Connect stops
asking on every upload, including every TestFlight build. Accurate rather than
convenient: the app implements no cryptography and only talks HTTPS through the
system stack, which is exempt.

### Setup controls off-screen (not a guideline, but it would have shipped)

The difficulty and map-size rows each hold four buttons in a half-width grid
column, with labels that will not shrink below their text. On every iPhone width
the fourth option sat past the right edge — nobody on a phone could select
Impossible, or the 15×15 board the whole board-scaling sweep exists to validate.
Adding 15×15 is what pushed the second row over. Fixed, and both rows now take
44pt tap targets.

---

## 3. The monetization decision — yours to make

This is the one open item, and it is a business call rather than a bug.

**Where things stand.** The store sells skins, map packs and the campaign
through Stripe Checkout. There is no IAP plugin in `package.json`, no
RevenueCat, and — worth knowing — **no native-platform detection anywhere in the
client**. The iOS build will show the same store page and open the same Stripe
URL as the web build.

**What the rules currently say.** Guideline 3.1.1 still requires in-app purchase
for digital content. But following the 2025 US court order, Apple's own text now
reads:

> "In all other storefronts, **except for the United States storefront, where
> this prohibition does not apply**, apps and their metadata may not include
> buttons, external links, or other calls to action that direct customers to
> purchasing mechanisms other than in-app purchase."

and

> "These entitlements are not required for developers to include buttons,
> external links, or other calls to action in their United States storefront
> apps."

So a Stripe link-out is permissible **on the US storefront**, with no entitlement
and no Apple commission. Everywhere else it is still a rejection.

### Three options

**A — US-only launch, keep Stripe.** Fastest, and you keep 100% of revenue.
Costs: no international release, and it rests on a carve-out created by
litigation Apple has contested. Also needs real engineering: the checkout must
open in the system browser rather than the WKWebView, and the post-purchase
return path has to bring the player back into the app. `window.open` inside
Capacitor is not that, and today the app does not even know it is on iOS.

**B — Implement StoreKit IAP.** Works worldwide, immune to how the appeal lands.
Costs 15% under the Small Business Program, plus real work: an IAP plugin or
RevenueCat, product configuration, receipt validation against the existing
entitlement system, and a second fulfilment path beside the Stripe webhook.

**C — Ship v1 with no purchases on iOS.** Hide the store behind a platform
check; the game is complete and free without it. Approval risk drops to
essentially zero, you learn whether anyone wants the game before building
payments twice, and the web build keeps selling to whoever finds it.

**My recommendation: C, then B.** Your goal tomorrow is a first build in
TestFlight, and every hour spent on payments is an hour not spent there. The
whole roster is free now anyway — the paid tier is skins, maps and the campaign,
none of which a new player misses in week one. Ship the game, find out if it
lands, and add IAP in 1.1 with the benefit of knowing whether it is worth 15%.

Option C is also the only one of the three that needs no research into what
Apple's appeal does next.

Whichever you choose, the platform check is needed either way. That is the
first piece of work when you have decided.

---

## 4. Still to do, in App Store Connect

Cannot be done from the repo:

- **App privacy "nutrition label"** — must match `PrivacyInfo.xcprivacy`. The
  manifest is the source of truth; copy from it.
- **Age rating questionnaire.** Sunder is a war game with bloodless combat. The
  answers determine whether COPPA applies — see §2.
- **Screenshots** at required sizes, and an App Preview if you want one.
- **Support URL** — a required field, separate from the privacy URL.
- **Export compliance** is pre-answered by the Info.plist key; verify no
  questionnaire appears on the first upload.

## 5. The fatality share needs a native plugin

The share card built for fatalities uses the Web Share API
(`navigator.canShare({ files })` → `navigator.share`). That works in Safari and
Chrome. Inside Capacitor's WKWebView it is **not dependable**, and the supported
route is the `@capacitor/share` plugin, which is not a dependency yet. Until it
is, the iOS build falls through to the download branch — which is close to
useless on a phone.

This matters more than it looks: the share is the entire reason the feature
exists. A spectacular moment nobody can export is spectacle wasted.

Adding the plugin is small — `@capacitor/share` plus `@capacitor/filesystem` to
write the PNG somewhere shareable, then `cap sync`. Worth doing before the
fatality feature is shown to anyone.

Video is a separate, larger question. Recording the canvas is the obvious build
and it is the one thing that does not work here: WebKit bug 229611 —
`MediaRecorder` driven by `canvas.captureStream()` produces a blank video on
iOS. A clip therefore needs either a client-side encoder (a GIF encoder is
plausible; Sunder's flat palette compresses almost losslessly) or native
capture via ReplayKit. Neither is needed for launch.

## 6. Known, accepted, not blocking

- `server/stripe.ts` builds its client at import, so `pnpm test` needs any
  non-empty `STRIPE_SECRET_KEY`. CI sets a placeholder. The lazy-client fix is
  still unshipped.
- No on-device pass has been done. The touch-target work was checked in a
  browser at iPhone widths, which is how the off-screen setup controls survived
  as long as they did.
