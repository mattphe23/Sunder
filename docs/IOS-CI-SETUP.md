# Shipping Sunder to iOS without owning a Mac

This is the one-time setup that turns `.github/workflows/ios.yml` from a
placeholder into a working release pipeline. Every step below happens in a web
browser or in any Linux/WSL shell. **No Mac is required at any point**, because
the only machine that needs macOS is GitHub's build runner, which is rented by
the minute and free for public repositories.

Budget roughly ninety minutes for the first pass, most of it waiting on Apple.
After that, releasing is one button in the Actions tab.

> `.github/workflows/ios.yml` is committed and live — nothing needs to be
> pasted into the web UI. The `verify` and `ios-build` jobs run on every push
> today; `testflight` stays dormant until the secrets below exist.

---

## What you are building

| Job in the workflow | Runner | Trigger | Needs Apple credentials | What it does |
|---|---|---|---|---|
| `verify` | Linux | every push touching the app | No | Installs, runs 185 tests plus type-check, confirms the committed icon and splash still match the sigil source, and builds the web app |
| `ios-build` | macOS | after `verify` | No | Syncs the web build into the Xcode project, compiles the real iOS app unsigned, and asserts the web build really landed inside `App.app` |
| `testflight` | macOS | manual, from the Actions tab | Yes | Archives, signs, exports a `.ipa`, validates it, and uploads it to TestFlight |

Two splits matter here.

The first is credentials. `verify` and `ios-build` run today with no Apple
account at all, so the iOS project cannot quietly rot in the months before you
ship. `testflight` stays dormant until the secrets exist, then becomes the
release button.

The second is the runner. macOS minutes bill at ten times the Linux rate on a
private repository, so the tests, the type-check and the asset check run on
Linux and only the two jobs that genuinely need Xcode pay for a Mac.

---

## Step 1 — Apple Developer Program membership

Enrol at [developer.apple.com/programs](https://developer.apple.com/programs/).
It costs **99 USD per year** and is the one unavoidable expense. Enrolment as an
individual is usually approved within a day; as an organisation it needs a
D-U-N-S number and takes longer.

While you wait, note your **Team ID** from
[Membership details](https://developer.apple.com/account) — a ten-character
string such as `A1B2C3D4E5`. That becomes the `APPLE_TEAM_ID` secret.

---

## Step 2 — Decide the bundle identifier

The project currently carries the placeholder `com.sunder.livingforge`. A bundle
id is permanent once an app exists in App Store Connect, so choose deliberately.
Convention is reverse-DNS on a domain you control, for example
`com.yourcompany.sunder`.

Register it at
[Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
→ **+** → App IDs → App. Give it a description, paste the bundle id, and leave
every capability switched off — Sunder needs none of them, and each one you add
becomes a question on the privacy form later.

> The workflow reads the real bundle id out of the provisioning profile at build
> time, so you never have to edit the Xcode project to match. Registering a
> different id than the placeholder is fine and expected.

---

## Step 3 — Create a signing certificate without a Mac

Apple's documentation assumes Keychain Access generates your signing request.
It does not have to. A certificate signing request is just a standard PKCS#10
file, and `openssl` produces an identical one on any machine.

Run this in any Linux or WSL shell:

```bash
# 1. A private key. This file is the thing that must never leak.
openssl genrsa -out ios_distribution.key 2048

# 2. A signing request. Apple ignores the subject fields except the email,
#    so the values below are conventional rather than meaningful.
openssl req -new -key ios_distribution.key -out ios_distribution.csr \
  -subj "/emailAddress=you@example.com/CN=Sunder Distribution/C=US"
```

Upload `ios_distribution.csr` at
[Certificates](https://developer.apple.com/account/resources/certificates/list)
→ **+** → **Apple Distribution**. Download the resulting `distribution.cer`.

Now convert Apple's certificate and your private key into the single PKCS#12
bundle that `codesign` expects:

```bash
# 3. Apple hands back DER; openssl wants PEM.
openssl x509 -inform DER -in distribution.cer -out distribution.pem

# 4. Combine into a .p12. Choose a strong password — you will store it as a
#    secret, and an empty one silently breaks the import step on the runner.
openssl pkcs12 -export \
  -inkey ios_distribution.key \
  -in distribution.pem \
  -out ios_distribution.p12 \
  -name "Apple Distribution: Sunder"

# 5. Base64 for GitHub, which stores secrets as text.
base64 -w0 ios_distribution.p12 > ios_distribution.p12.base64
```

Keep `ios_distribution.key` and `ios_distribution.p12` somewhere safe and
private — a password manager, not the repository. Losing them is recoverable
(revoke and repeat this step); leaking them lets someone else sign software as
you.

---

## Step 4 — Create the provisioning profile

At [Profiles](https://developer.apple.com/account/resources/profiles/list) →
**+** → **App Store Connect** (under Distribution), select the App ID from step 2
and the certificate from step 3. Name it something you will recognise in a log,
for example `Sunder App Store`. Download the `.mobileprovision`, then encode it:

```bash
base64 -w0 Sunder_App_Store.mobileprovision > profile.base64
```

The workflow reads the profile's own embedded name and UUID rather than trusting
a hardcoded string, so whatever you called it will be used correctly.

---

## Step 5 — Create an App Store Connect API key

This is what lets the runner upload without a password or two-factor prompt.

Go to
[App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
and create a key with the **App Manager** role. Apple shows you three things:

| Value | Where it appears | Secret name |
|---|---|---|
| Issuer ID | above the key list, a UUID | `APP_STORE_CONNECT_ISSUER_ID` |
| Key ID | the key's row, ten characters | `APP_STORE_CONNECT_KEY_ID` |
| `AuthKey_XXXXXXXXXX.p8` | one-time download | `APP_STORE_CONNECT_KEY_P8` |

**The `.p8` downloads exactly once.** If you lose it, revoke the key and make a
new one. Encode it the same way:

```bash
base64 -w0 AuthKey_XXXXXXXXXX.p8 > key.base64
```

---

## Step 6 — Register the app record

In [App Store Connect → Apps](https://appstoreconnect.apple.com/apps) → **+** →
**New App**, pick iOS, choose the bundle id from step 2, and set a name and
primary language. An SKU is an internal string only you see; `sunder-ios` is
fine.

Uploads fail with a confusing "no such app" style error if this record does not
exist yet, so do not skip it.

---

## Step 7 — Paste the secrets into GitHub

In the repository → **Settings** → **Secrets and variables** → **Actions**, add
the following as repository secrets. Paste the *contents* of each base64 file,
not the filename.

| Secret | Value |
|---|---|
| `APPLE_TEAM_ID` | Team ID from step 1 |
| `IOS_DIST_CERT_P12` | contents of `ios_distribution.p12.base64` |
| `IOS_DIST_CERT_PASSWORD` | the password you chose in step 3 |
| `IOS_PROVISIONING_PROFILE` | contents of `profile.base64` |
| `APP_STORE_CONNECT_KEY_ID` | Key ID from step 5 |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from step 5 |
| `APP_STORE_CONNECT_KEY_P8` | contents of `key.base64` |

The workflow's first step checks all of these and fails with the names of any
that are missing, rather than dying twenty minutes later inside `xcodebuild`.

### Optional: an approval gate

The `testflight` job declares `environment: app-store`. If you create an
environment of that name under **Settings** → **Environments** and add yourself
as a required reviewer, every upload waits for an explicit approval click. Worth
doing once other people can push to the repository.

---

## Step 8 — Ship a build

Actions tab → **iOS** → **Run workflow**. Optionally set a marketing version
such as `1.0.0`; leave it blank to keep whatever the project already declares.

The build number is set automatically from the workflow run number, which only
ever increases, so Apple will never reject an upload as a duplicate — the single
most common cause of a failed first submission.

Expect fifteen to twenty-five minutes. Afterwards the build appears in
TestFlight, first as "Processing" for a few minutes, then installable on any
device you add as an internal tester.

---

## What still cannot be automated

Three things sit outside the pipeline, and two of them are judgement calls no
amount of automation can make on your behalf.

**Things only a human on a real device can assess.** The handoff asks whether
the launch screen flashes on the way to the first rendered frame, whether the
notch and home indicator clear the HUD, whether dragging a full 13×13 board
holds its frame rate, and whether a thirty-turn match feels right in the hand.
TestFlight puts the build on your own phone, so you can answer these yourself —
but they are observations, not tests.

**In-app purchases.** Sunder's store is Stripe on the web. App Review guideline
3.1.1 requires Apple's own in-app purchase for unlocking content inside the app,
and web checkout for the same goods is a rejection. Either strip purchasing from
the iOS build and sell only on the web, or add a StoreKit plugin with matching
products in App Store Connect. This is a product decision and it should be made
before the first submission, not after a rejection.

**The privacy questionnaire.** App Store Connect asks what you collect. Sunder
has an analytics endpoint and optional accounts, so the answer is not "nothing".
Answer it accurately; a wrong declaration is worse than a generous one.

---

## When something fails

| Symptom | Cause | Fix |
|---|---|---|
| `No signing certificate "iOS Distribution"` | the `.p12` lacks the private key | redo step 3 — the `openssl pkcs12` command must include `-inkey` |
| `errSecInternalComponent` during signing | keychain partition list not set | already handled by the workflow; if you changed that step, restore `security set-key-partition-list` |
| `Provisioning profile doesn't match bundle identifier` | app record and profile disagree | confirm steps 2, 4 and 6 all use the same id |
| `The bundle version must be higher than the previously uploaded version` | a build number was reused | shouldn't happen with run numbers; if you rebuilt an old run, just re-run the workflow |
| `Invalid Pre-Release Train` | no app record | do step 6 |
| `scheme "App" not found` | shared scheme missing | `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` must be committed — it is, so check it was not deleted |
| `Neither apiKey nor config.authenticator provided` in five server tests | `server/stripe.ts` builds its client at import time and the SDK rejects an empty key | set `STRIPE_SECRET_KEY` to any non-empty string; the workflow does this itself, and locally `STRIPE_SECRET_KEY=sk_test_x pnpm test` is the difference between 162 and 185 passing |

Failed runs upload the `.ipa` and export logs as an artifact for fourteen days,
which is usually faster to read than the console output.

---

## Cost

| Item | Cost |
|---|---|
| Apple Developer Program | 99 USD per year |
| GitHub Actions macOS runners, public repository | free |
| GitHub Actions macOS runners, private repository | ~0.08 USD per minute, so roughly 1.60 USD per release build |
| A Mac | not required |

Making the repository private later is the one change that introduces a per
build cost. At a handful of releases a month it stays under a few dollars.
