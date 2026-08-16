# Native verification checklist (template)

**Status:** Template only — this document records manual verification steps for a future release. It does **not** claim iOS or Android pass, accessibility conformance, or release readiness.

**When to use:** After MVP feature work stabilizes and before requesting signed release approval. Replace placeholder evidence paths with real device artifacts stored outside this repository if required by DesignOps release intent.

## Preconditions

- [ ] Build from a tagged commit intended for verification
- [ ] Fixture-only deck loaded (`DECK_VERSION` recorded)
- [ ] No network, account, or telemetry dependencies enabled

## iOS smoke export

```bash
npm --prefix apps/mobile run export:ios
```

- [ ] Command exits 0
- [ ] Bundle artifact path recorded below

## Android smoke export

```bash
npm --prefix apps/mobile run export:android
```

- [ ] Command exits 0
- [ ] Bundle artifact path recorded below

## Accessibility (VoiceOver / TalkBack)

- [ ] Room Beacon holder: active prompt hidden from assistive tech
- [ ] Screen-facing / Private Relay: full round completable with tap-only controls
- [ ] Truth review labels are readable as text, not color-only

### Large text sizes

The two recovery screens scroll their bodies so a long block cannot clip, and the
scroll containers are asserted structurally in the render tests. The overflow
behaviour itself is only observable on a device, and these rows are the real
check.

The reason is worth stating correctly, because an earlier version of this note
got it wrong and the wrong reason discourages a test that would be worth writing.
It is **not** that the font scale cannot be set in a test: `Dimensions.set` and
`PixelRatio.getFontScale` are both mockable, so a test can absolutely tell the app
the system text is at maximum. The reason is that **jest has no text measurement**
— `onLayout` never fires with real dimensions and the test renderer produces no
geometry — so whether a block overflows, clips, or pushes a control off-screen is
unobservable at any scale. A future scale-aware layout (one that switched to a
stacked arrangement above a threshold, say) *would* be testable; today nothing in
the app reads the scale, so there is nothing to assert.

What IS enforced automatically: `src/components/fontScaling.test.mjs` fails the
build if any source file sets `allowFontScaling` or `maxFontSizeMultiplier`. That
guards the property these rows depend on — text that actually grows — against the
one-line fix that would otherwise be tempting when a row below fails.

At the largest system text size (iOS: Settings → Accessibility → Display & Text
Size → Larger Text, slider at maximum; Android: Settings → Display → Font size,
maximum):

- [ ] Private Relay shutter: the reveal control stays reachable without scrolling
- [ ] Private Relay shutter: the body text scrolls rather than clipping
- [ ] Content-unavailable: the guard line explaining *why* play stopped is reachable
- [ ] Round: prompt text wraps rather than truncating, and both answer controls stay on screen
- [ ] Home: the scrolling ticker loops without a visible seam

  The ticker measures its own width off-screen against a fixed 5000px box and
  renders two copies at that measured width, so travelling one width is seamless.
  At maximum text size the string could approach 5000px, at which point
  `numberOfLines={1}` clips the measurement and the loop gains a visible gap.
  Cosmetic only — the ticker is hidden from assistive tech, so this is a seam, not
  lost information.

## Sensors (optional tilt)

- [ ] Tilt remains opt-in with calibration and immediate tap fallback
- [ ] Uncalibrated or denied sensor permission does not block tap answers

## Lifecycle / offline

- [ ] Background during Private Relay enters shutter without spoiler
- [ ] Pause/resume preserves score without duplicate commits
- [ ] Offline play and local report queue function without network

## Performance (record measurements, do not assert pass here)

Targets (DesignOps / architecture): cold start → Home **&lt; 2.5s**; first
playable ROUND **&lt; 5s**; active play **60 fps**; no memory growth across 10
rematches. Simulator and Expo Go timings are **invalid** for release evidence —
use a mid-tier physical iPhone and a mid-tier physical Android, preferably a
dev client / release-like build.

### How to measure (dev builds)

In `__DEV__`, the app logs `[startup] <label>: +<ms>` via
`apps/mobile/src/perf/startupMarks.js`:

| Label | Meaning |
| --- | --- |
| `session-ready` | `createSession` finished (pool ready; run may be deferred) |
| `fonts-ready` | expo-font loaded (or failed through to system face) |
| `home-interactive` | Home is on screen after the font gate |
| `first-round` | First `START_ROUND` dispatched this process |

Record wall-clock cold start with a stopwatch as well (icon tap → Home
readable). Prefer matching the stopwatch to `home-interactive` on device.

- [ ] Cold start time: ______ seconds (device / OS: ________)
- [ ] Cached first round ready: ______ seconds (device / OS: ________)
- [ ] Active round maintains smooth interaction (note device model): ________
- [ ] 10 rematches: no obvious memory growth (Instruments / Android Profiler note): ________

Lazy-loading non-HOME screens stays **deferred** until a physical cold start
still misses &lt; 2.5s after splash + deferred `buildRun` + smaller Home Mark.
Do not invent times here from a cloud agent or simulator.
## Evidence log (fill during manual runs)

| Platform | Check | Device / OS | Result | Artifact path |
| --- | --- | --- | --- | --- |
| iOS | export smoke | | | |
| Android | export smoke | | | |
| iOS | VoiceOver round | | | |
| Android | TalkBack round | | | |
| iOS | lifecycle/offline | | | |
| Android | lifecycle/offline | | | |

## Sign-off

This checklist does not substitute for `.designops/native-verification.json`, signed handoff approval, or human editorial evidence. Mark each row only after observing the behavior on a physical device.
