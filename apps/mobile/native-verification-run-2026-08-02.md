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
> a clean launch at AX3: the quote wraps and scrolls, both answer controls stay
> pinned on screen, and both context pills wrap intact. The device rows below remain
> **NOT OBSERVED** regardless — a simulator cannot close them.
>
> D4 is **not** fixed and was not caused by the fix; see its note.

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

### What behaved correctly

- The **review screen scrolls** properly at AX5; report chips and `NEXT PROMPT` all remain reachable and readable. The recovery-screen scrolling this checklist describes appears to work.
- Truth labels stay textual: "— FABRICATED FOR THIS GAME" pairs a dash glyph with words, never colour alone.
- Report scope is stated in the UI: "only card ID, reason, deck version, and timestamp. No player identity or free text."
- Tilt defaults to **OFF** with "Tapping always works" — opt-in, as required.
- One tap scored exactly once (`ROOM · 0` → `ROOM · 100`).

### D4 — Text renders half-drawn after the system text size changes at runtime

Every text row clips mid-glyph and stops wrapping. It persisted across a minute and
two independent capture paths, so it is not a screenshot artifact, and a tap still
advanced the round normally — the app is misrendered, not frozen.

Isolated on the second pass: **a fresh launch at any content size renders perfectly,
including AX5.** The corruption only appears once the content size is changed while
the app is running. That points at stale text layers not being re-laid-out on a
Dynamic Type change, not at the layout itself.

Present both before and after the D1–D3 fix, so it is neither caused nor cured by it.
Left open deliberately. It matters on device: iOS users change text size in Settings
and return to a running app, which is exactly this path.

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
