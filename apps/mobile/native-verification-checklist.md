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

The two recovery screens scroll their bodies so a long block cannot clip, but a
render test cannot simulate font scaling — jest-expo has no way to set a text
size, so the scroll containers are asserted structurally and the actual overflow
behaviour is only observable on a device. These rows are the real check.

At the largest system text size (iOS: Settings → Accessibility → Display & Text
Size → Larger Text, slider at maximum; Android: Settings → Display → Font size,
maximum):

- [ ] Private Relay shutter: the reveal control stays reachable without scrolling
- [ ] Private Relay shutter: the body text scrolls rather than clipping
- [ ] Content-unavailable: the guard line explaining *why* play stopped is reachable
- [ ] Round: prompt text wraps rather than truncating, and both answer controls stay on screen

## Sensors (optional tilt)

- [ ] Tilt remains opt-in with calibration and immediate tap fallback
- [ ] Uncalibrated or denied sensor permission does not block tap answers

## Lifecycle / offline

- [ ] Background during Private Relay enters shutter without spoiler
- [ ] Pause/resume preserves score without duplicate commits
- [ ] Offline play and local report queue function without network

## Performance (record measurements, do not assert pass here)

- [ ] Cold start time: ______ seconds
- [ ] Cached first round ready: ______ seconds
- [ ] Active round maintains smooth interaction (note device model)

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
