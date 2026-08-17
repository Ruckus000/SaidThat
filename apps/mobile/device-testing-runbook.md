# Device testing runbook

How to get a build of SaidThat onto a physical phone. This is a **testing**
procedure, not a release procedure — nothing here constitutes a release claim,
and none of it satisfies `node tools/designops/enforce.mjs --intent release`,
which is still fail-closed and still requires signed handoff plus a hash-bound
`.designops/native-verification.json`.

Read that sentence literally before sharing a build: a build in a tester's hands
is not evidence that the app is accessible, source-verified, or legally cleared.

## What is already configured

- `eas.json` — build profiles only. There is deliberately **no EAS Update
  channel** and no OTA delivery: a remote delivery endpoint is a stop condition
  in `docs/mvp-build-queue.md`, and shipping JS over the air would be one.
- `app.json` — `ios.bundleIdentifier` and `android.package` are committed, so
  every machine builds the same identity. Without them, a teammate's prebuild
  invents a different id and installs a *second* copy of the app.
- **EAS project linked** (owner decision 2026-08-16) —
  `@jphilistin12/said-that`, project `9ddf1311-9179-4d4b-9185-dc72892f3ea9`,
  recorded in `app.json` as `extra.eas.projectId` and `owner`. Do not run
  `eas init` again; it is already done.
- `appVersionSource: "remote"` with `autoIncrement` on `production` — EAS owns
  the build number. TestFlight hard-rejects a duplicate build number, and manual
  bumping in `app.json` is the usual way that upload fails at 11pm. Flip to
  `"local"` if you would rather see the number in git; you then own the bumping.

## Export compliance

`app.json` declares `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`. Without
it, every TestFlight upload stalls until someone answers the export-compliance
question by hand in App Store Connect.

The basis, as of 2026-08-17: the shipped source has **no network call sites**
(`fetch`, `XMLHttpRequest`, `WebSocket`, `axios` — none) and **no cryptographic
API use**. The app makes no HTTPS requests at all, so there is no traffic to
encrypt. The `https://` strings in `deck.generated.js` are source-record text
rendered on the reveal screen; nothing fetches them. Local storage is
AsyncStorage, unencrypted.

**Re-check this declaration before adding networking, an account system, remote
reports, or analytics.** Any of those changes the answer, and the declaration is
made in the account holder's name to a US export regime — it is not a formality.
Nothing here is legal advice.

## What is NOT configured, and needs a human

These steps need credentials or a paid account. An agent must not perform them:

1. **Apple Developer Program membership** ($99/yr). Required for *any* install on
   a device you do not physically own, and for TestFlight.
2. **Apple credentials** — `eas credentials` or letting `eas build` generate a
   distribution certificate and provisioning profile. Requires signing in to
   Apple with the account holder's own Apple ID. In local mode this writes
   `credentials.json`, which carries the certificate password in plaintext; it
   is gitignored, and it must stay that way.
3. **Device registration** for ad-hoc `preview` builds — `eas device:create`
   generates a registration link; each tester opens it on their phone once.

Registering the bundle identifier with Apple is the irreversible step. Until the
first build runs, `com.jphilistin12.said-that` is local config and free to
change. Afterwards it can never be renamed or reused.

## Route A — free, no Apple account, your own phone only

Fastest way to hold the app in your hand. Free Apple IDs get a 7-day
provisioning profile, so the app stops launching after a week and needs a
rebuild. Fine for checking the accessibility rows; useless for testers.

```bash
open apps/mobile/ios/SaidThat.xcworkspace
```

Set a Team under Signing & Capabilities, plug the phone in, pick it as the
destination, and run. Trust the developer profile on the phone under
Settings → General → VPN & Device Management.

## Route B — TestFlight internal (recommended first real route)

Up to 100 testers who are members of your App Store Connect team. **No Apple
Beta App Review**, which matters — see the content note below.

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Then add testers in App Store Connect under TestFlight → Internal Testing.

First run done 2026-08-17: version 1.0.0, build 2, from commit `a8d3b87`.
`ascAppId` 6802286345 is now recorded in `eas.json`, so submits no longer need
interactive mode. The distribution certificate and provisioning profile live on
EAS, so builds do not either. Both were one-time.

Note that `eas submit` reporting `finished` means EAS finished handing the
binary to App Store Connect. Apple still processes it afterwards, and a build
is not installable until that completes — check TestFlight, not the CLI.

## Route C — ad-hoc device builds, no TestFlight

For a handful of known phones, skipping App Store Connect entirely. Each device
must be registered first.

```bash
cd apps/mobile
eas device:create                                  # once per tester phone
eas build --platform ios --profile preview
```

EAS returns an install URL. It only works on registered devices.

## Before any *external* TestFlight round

External testing means Apple Beta App Review, and this app is a harder review
than most. Do not treat these as paperwork:

- **Real public figures.** The deck ships authentic cards naming real people
  alongside fabricated quotes. The reveal keeps `AUTHENTIC` and
  `SIMULATED AUTHENTIC` textually distinct, and fabricated cards say
  `FABRICATED FOR THIS GAME`. That distinction is the defence — have the
  argument written down before review, not after a rejection.
- **Sentry.** `README.md` states the rule plainly: Sentry before external
  TestFlight. It is not wired up yet.
- **Accessibility.** Every VoiceOver and TalkBack row in
  `native-verification-checklist.md` is still `NOT OBSERVED`. The repository
  treats accessibility as a release requirement, not polish.
- **Legal.** See `docs/legal-and-platform-risks.md`. Nothing in this repo is
  legal advice or clearance.

## What a cloud build sends, and where

`eas build` uploads the project to Expo's build servers. That includes the
bundled deck — real public-figure names, their quotes, and the retained source
URLs. It is a private repository today, so this adds Expo as a second party
holding that content, alongside GitHub.

This does not change the app's own behaviour: the runtime still has no network
call sites, and "everything stays on this phone" remains true of the shipped
binary. It is the *build pipeline* that leaves the machine, not player data.
Use `eas build --local` if that trade is ever unacceptable.

## Cost note

EAS cloud builds consume build credits on the Expo account, and the free tier
queues. `eas build` can cost money on a paid plan. Check the plan before
kicking off a run of builds.
