# Native verification run — 2026-08-02

**Status:** In progress, and **not** evidence of a pass. Nothing here claims iOS or
Android verification, accessibility conformance, or release readiness. Rows marked
`NOT OBSERVED` were not run at all; do not read an unticked box as a negative result
either. This file is a working log, not a sign-off.

**This is not `.designops/native-verification.json`.** Release intent still requires
that hash-bound record plus signed handoff approval. A markdown log cannot satisfy it.

**Template:** [`native-verification-checklist.md`](native-verification-checklist.md), row order preserved.

| Field | Value |
| --- | --- |
| Commit | `7c60423` |
| Tag | `native-verify-2026-08-02` (local only, not pushed) |
| `DECK_VERSION` | `0.2.0-local-fixture` |
| Operator | Automated agent for the machine-checkable rows only |

## Preconditions

- [x] Build from a tagged commit intended for verification — `7c60423`, tagged as above
- [x] Fixture-only deck loaded (`DECK_VERSION` recorded) — `0.2.0-local-fixture`
- [x] No network, account, or telemetry dependencies enabled — no `fetch`/`XMLHttpRequest`/`WebSocket`/`axios`/`supabase`/analytics call sites in non-test source; runtime dependencies are `expo`, `expo-font`, `expo-haptics`, `expo-sensors`, `expo-status-bar`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-svg`, `@react-native-async-storage/async-storage`

One caveat on the first row: the tag points at a clean commit, but the working tree
at run time also held an untracked `docs/content/` candidates file that is not part of
the tagged build and did not enter it.

## iOS smoke export

- [x] Command exits 0 — `npm --prefix apps/mobile run export:ios`
- [x] Bundle artifact path recorded below

## Android smoke export

- [x] Command exits 0 — `npm --prefix apps/mobile run export:android`
- [x] Bundle artifact path recorded below

## Accessibility (VoiceOver / TalkBack)

- [ ] Room Beacon holder: active prompt hidden from assistive tech — **NOT OBSERVED**
- [ ] Screen-facing / Private Relay: full round completable with tap-only controls — **NOT OBSERVED**
- [ ] Truth review labels are readable as text, not color-only — **NOT OBSERVED**

Requires a human driving VoiceOver on a device and TalkBack on Android. The checklist's
own sign-off line restricts these to physical-device observation.

### Large text sizes

- [ ] Private Relay shutter: the reveal control stays reachable without scrolling — **NOT OBSERVED**
- [ ] Private Relay shutter: the body text scrolls rather than clipping — **NOT OBSERVED**
- [ ] Content-unavailable: the guard line explaining *why* play stopped is reachable — **NOT OBSERVED**
- [ ] Round: prompt text wraps rather than truncating, and both answer controls stay on screen — **NOT OBSERVED**
- [ ] Home: the scrolling ticker loops without a visible seam — **NOT OBSERVED**

## Sensors (optional tilt)

- [ ] Tilt remains opt-in with calibration and immediate tap fallback — **NOT OBSERVED**
- [ ] Uncalibrated or denied sensor permission does not block tap answers — **NOT OBSERVED**

Not reachable in a simulator at all: no accelerometer. Device-only by nature.

## Lifecycle / offline

- [ ] Background during Private Relay enters shutter without spoiler — **NOT OBSERVED**
- [ ] Pause/resume preserves score without duplicate commits — **NOT OBSERVED**
- [ ] Offline play and local report queue function without network — **NOT OBSERVED**

## Performance (record measurements, do not assert pass here)

- [ ] Cold start time: ______ seconds — **NOT MEASURED**
- [ ] Cached first round ready: ______ seconds — **NOT MEASURED**
- [ ] Active round maintains smooth interaction (note device model) — **NOT MEASURED**

Simulator timings are not valid measurements and were deliberately not recorded.

## Evidence log

| Platform | Check | Device / OS | Result | Artifact path |
| --- | --- | --- | --- | --- |
| iOS | export smoke | host toolchain, Xcode 26.6 | exit 0 | `/tmp/said-that-ios-export` — `_expo/static/js/ios/index-ac56567693713da49f5f9db13bf62f68.hbc` (1.8 MB) |
| Android | export smoke | host toolchain | exit 0 | `/tmp/said-that-android-export` — `_expo/static/js/android/index-46f8cc7dd460ceab383953d76ba63c8f.hbc` (1.8 MB) |
| iOS | VoiceOver round | — | NOT OBSERVED | — |
| Android | TalkBack round | — | NOT OBSERVED | — |
| iOS | lifecycle/offline | — | NOT OBSERVED | — |
| Android | lifecycle/offline | — | NOT OBSERVED | — |

## Simulator dry run — context only, not checklist evidence

Recorded separately and deliberately **outside** the table above, because the checklist
restricts its rows to physical-device observation. None of this ticks anything.

| Item | Detail |
| --- | --- |
| Device | iPhone 17 simulator, iOS 26.5 (`58ACB634-F9B0-47CE-821E-A1EA3A5B4596`) |
| Bundle id | `com.anonymous.said-that` — placeholder invented by `expo prebuild`; `app.json` sets none |
| Result | Built, installed, launched |
| Observed | Home screen renders; fixture disclosure "LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT" and "No accounts · no feed · everything stays on this phone" both visible — demo-spec route step 1 |

## Android emulator dry run — context only, not checklist evidence

Same standing as the iOS simulator section: an emulator is not a device, so **no row
above is ticked**. Its value is that every accessibility fix so far was verified on
iOS only, and Android scales text by a different mechanism.

| Item | Detail |
| --- | --- |
| Device | Pixel 9 Pro emulator, Android 16 (API 36), `sdk_gphone64_arm64` |
| Package | `com.anonymous.saidthat` — placeholder from `expo prebuild`; `app.json` sets none |
| Result | Built with Gradle, installed, launched |

**Android has two independent scaling axes** where iOS has one: Font size
(`font_scale`) and Display size (density). They compound — the second shrinks the
available width while the first grows the text — so both were exercised.

| Condition | Round | Setup | Home |
| --- | --- | --- | --- |
| `font_scale 1.0` | correct | correct | correct |
| `font_scale 2.0` (Android max) | statement complete and wrapped, both answers and pause on screen without scrolling | both titles whole, role segment stacked and readable | wordmark whole, ticker rendering, CTA present |
| `font_scale 2.0` + density 546 (largest Display size) | pills wrap to separate rows, statement complete, both answers reachable by scrolling | correct | correct |

All four fixes hold. Nothing found on Android that was not already fixed for iOS.

**D4 has no Android equivalent.** Changing `font_scale` on a running app makes Android
recreate the Activity — a brief white flash — and the app then re-renders identically
to a fresh launch at that size. The OS does the remount the iOS fix has to perform
itself, so the `fontScale` key is iOS-motivated but harmless here.

**The ticker seam is more visible on Android.** At `font_scale 1.0` there is a clear
gap between the two copies rather than the subtle discontinuity seen on iOS. Same
recorded residual, worse on this platform. Still cosmetic, still hidden from
assistive tech.

**Not covered by this run:** TalkBack, Android lifecycle and offline behaviour, and
performance. Those are the Android rows above, and they remain **NOT OBSERVED** —
an emulator cannot close them any more than a simulator can.

## Physical device — installed, not yet exercised

| Item | Detail |
| --- | --- |
| Device | `Ruckus`, iPhone 16 Pro Max (iPhone17,2), `6A0B43E7-560E-57D3-AF52-7CFA1F0AAAE5` |
| Install | Succeeded — `com.anonymous.said-that` |
| Exercised | **No.** No row above was run on it |

Free personal team, so the build expires roughly 7 days after install and needs a
rebuild to keep testing. First launch may require Settings → General → VPN & Device
Management → Trust.

## Defects found in the simulator dry run

> **Resolution (same day):** D1, D2 and D3 are fixed in `RoundScreen.tsx` and
> `styles.ts`, with regression cover in `RoundScreenScaling.test.tsx`. Re-verified on
> clean launches at AX3 and AX5: the quote wraps and scrolls, the answers and pause
> are reachable, and both context pills wrap intact.
>
> The first attempt pinned the answers outside the scroller so they could never
> scroll away. Checking it at AX5 showed that just moved the squeeze up a level —
> the two controls took the whole screen and left the prompt a 40pt sliver. At that
> size a readable prompt and two full-size controls cannot both fit, so everything
> scrolls instead: being unable to read the statement is worse than having to scroll
> to the buttons.
>
> The device rows below remain **NOT OBSERVED** regardless — a simulator cannot
> close them. D4 is **not** fixed and was not caused by the fix; see its note.

Simulator observations, so **no row above is ticked**. But these are layout
behaviours, not simulator artifacts, and the device rows they correspond to should
be expected to fail until they are fixed. Screenshots:
`~/Documents/said-that-verification-2026-08-02/`.

### D1 — The round prompt is truncated, then disappears, at accessibility text sizes

The statement players vote on is unreadable well before the largest setting. The
round screen does not scroll, so there is no recovery.

| Content size | Round prompt card |
| --- | --- |
| `medium` … `extra-extra-extra-large` (all standard sizes) | Correct. Full quote, both controls, header intact |
| `accessibility-medium` (AX1) | Quote **truncated mid-sentence** — "I collect alarm clocks" renders, "because one is never enough." is dropped. No ellipsis, no scroll |
| `accessibility-extra-large` (AX3) | Quote **entirely absent**. Only the eyebrow label and the quote glyph remain |
| `accessibility-extra-extra-extra-large` (AX5) | Quote absent; card collapses to an empty outline |

Reproduce: `xcrun simctl ui <udid> content_size accessibility-medium`, then open any
round. This is the checklist's "Round: prompt text wraps rather than truncating" row,
and on this evidence it fails from AX1 upward.

### D2 — Answer controls leave the screen at AX5

At `accessibility-extra-extra-extra-large` the `TOTAL LIE` control and its
"made for the game" sublabel extend past the bottom edge, and the round screen does
not scroll — swiping does not move it. Directly contradicts "both answer controls
stay on screen". Fine at AX3 and below.

### D3 — Header score pill clips at the right edge

From roughly AX3 upward the `ROOM · N` pill is cut off by the screen edge, so the
score is unreadable. Present on every screen that shows the header.

### D5 — The setup screen breaks at AX5

> **Fixed**, same pattern as D1-D3: wrap before shrink. Verified on clean launches
> at AX5 and at `medium`, where the layout is unchanged. `SetupScreenScaling.test.tsx`
> holds the contract; each assertion was mutation-checked.
>
> One residual, recorded rather than over-tuned: at AX5 `SCREEN-FACING` wraps to two
> lines and the `F` grazes the capsule's corner curve. Legible, and a long way from
> the two labels drawn on top of each other.

Seen while navigating to the round at `accessibility-extra-extra-extra-large`, on
`SetupScreen`:

- The `PRIVATE RELAY` choice title is clipped at the right edge rather than wrapping.
- The `I'M HOLDING` / `SCREEN-FACING` segmented control overlaps itself, both labels
  drawn on top of one another.

Same class as D1-D3 — fixed-shape rows meeting a text scale that outgrows them — but
a different screen, so it is recorded rather than folded into that change.

### What behaved correctly

- The **review screen scrolls** properly at AX5; report chips and `NEXT PROMPT` all remain reachable and readable. The recovery-screen scrolling this checklist describes appears to work.
- Truth labels stay textual: "— FABRICATED FOR THIS GAME" pairs a dash glyph with words, never colour alone.
- Report scope is stated in the UI: "only card ID, reason, deck version, and timestamp. No player identity or free text."
- Tilt defaults to **OFF** with "Tapping always works" — opt-in, as required.
- One tap scored exactly once (`ROOM · 0` → `ROOM · 100`).

### D4 — Stale layout after the system text size changes at runtime

> **Fixed.** App now keys its screens on `fontScale`, so they remount and re-measure
> when the size changes. Verified by the comparison that defines the bug: the render
> after a runtime change is now identical to a fresh launch at that size. Game state
> survives — a mid-round change keeps the round, the card and the score, because the
> reducer sits above the keyed node.

Changing the size while the app ran left text drawn at the new size inside frames
measured at the old one. The wordmark rendered as "SAI"; the ticker showed a
fragment measured at the previous scale. Both size themselves from a measurement
taken once on mount.

**A correction to how this was first recorded.** The original note said a fresh
launch was clean at every size. That was true of the round and setup screens, where
it was checked — but **not** of Home, which clips its hero wordmark and renders an
empty ticker at AX3 even on a fresh launch. Those are layout bugs of the D1/D5
class, not stale state, and they are still open. See D6.

### D6 — Home clipped its hero and lost its ticker at accessibility sizes

> **Fixed.** Verified on clean launches at AX3 and at `medium`, where the screen is
> unchanged. Three separate causes, only one of which was visible from the code.

On a **fresh** launch at AX3 and above, Home rendered its wordmark as "SAI" and its
ticker as a blank lime bar.

**Hero.** 92pt scaled past the screen width, and `homeHero` clips rather than wraps.
It now drops to the title role above a text scale of 1.6, and Home scrolls, so a hero
that outgrows the screen can no longer take the rest of the page with it — the CTA
included.

**Ticker.** The interesting one. The strip was measured inside a fixed 5000pt box so
it could be measured "at its true single-line width". But a `Text` stretches to the
width it is given, so `onLayout` reported **5000 at every text size** — the box, never
the string. Both copies were then laid out 5000 wide. At normal sizes that still drew
(the visible window shows the start of a very wide run); at accessibility sizes the
layer became too large to rasterise and the strip vanished.

The measurer now shrink-wraps, so it reports the string. The copies are not pinned to
that width — pinning truncated them the moment the two disagreed by a fraction — and
they clip rather than ellipsize, because a `…` mid-strip is worse than a seam.

A first attempt scaled the 5000 box by `fontScale`. That made it worse, pushing the
layer further past the rasteriser's limit, and is why the box is gone rather than
enlarged.

**Residual:** the copy boundary is visible as a slight seam in the scrolling strip at
all sizes. Cosmetic, on an element already hidden from assistive tech, and the
checklist anticipated exactly this trade.

### D7 — The statement's last line clipped instead of wrapping (fixed)

Found while confirming D4: at AX1 the quote laid its final line out at intrinsic
width and ran past the card — "snacks arrive." rendered as "snacks arri". Present on
a fresh launch, so not stale state. Fixed with `flexShrink` on the quote and the
attribution, the same remedy as the choice title in D5.

## Host environment issues found during this run

Recorded because each one blocked the pass and would block the next one.

| Issue | Resolution |
| --- | --- |
| Xcode 26.6 had no iOS platform installed; `xcodebuild -showdestinations` listed **zero** eligible destinations for the scheme, simulator and device alike | `xcodebuild -downloadPlatform iOS` — 8.52 GB, iOS 26.5 |
| CocoaPods crashed with `Unicode Normalization not appropriate for ASCII-8BIT` | Run with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` |
| Apple Development certificate expired 2026-07-09; 0 valid signing identities | Reissued by `xcodebuild -allowProvisioningUpdates` during the device build |
| `expo prebuild` rewrites tracked `app.json` (adds `ios.bundleIdentifier`) and `package.json` (`expo start` → `expo run`) on every run | Reverted; not committed. Re-check `git status` after any future prebuild |
| Simulator panel integration reports Xcode not selected despite `xcode-select -p` pointing at `/Applications/Xcode.app/Contents/Developer` | Unresolved; needs `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |

## Next actions

1. Run the device rows on `Ruckus` and record results here.
2. Android has no counterpart yet — TalkBack and Android lifecycle rows need an Android device or emulator; neither was set up in this run.
3. Only after both platforms are genuinely observed should `.designops/native-verification.json` be considered, and that path is separate from this file.
