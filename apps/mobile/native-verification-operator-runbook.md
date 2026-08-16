# Native verification operator runbook

**Purpose:** Walk a human operator through the device rows that cloud/CI cannot
observe, toward a future `.designops/native-verification.json` pass.

**Non-claims:** Completing this runbook does not invent signed handoff/release
approval. Do not write `status: "pass"` into
`.designops/native-verification.json` until every required check truly passed on
current commit evidence and the handoff digest matches.

## Before you start

1. Tag the commit under test (`git tag native-verify-YYYY-MM-DD`).
2. Confirm fixture-only deck (`DECK_VERSION` from the app / catalog).
3. Run machine exports:
   - `npm --prefix apps/mobile run export:ios`
   - `npm --prefix apps/mobile run export:android`
4. Install a development build on one physical iPhone and one Android phone.
   Simulators are insufficient for sensors and a11y rows.

## Matrix (both platforms)

Use `native-verification-checklist.md` row order. For each row record:
device model, OS version, result (pass/fail), artifact path (screenshot/video
outside the repo if needed), operator initials.

### Accessibility

- VoiceOver (iOS) / TalkBack (Android): holder prompt hidden in Room Beacon
- Full Private Relay / screen-facing round with tap-only
- Truth labels readable as text (not color-only)
- Maximum system text size: shutter reveal reachable; body scrolls; content-
  unavailable guard reachable; round answers stay on screen

### Sensors

- Opt-in tilt with calibration; deny permission → tap still works
- Uncalibrated device never blocks answers

### Lifecycle / offline

- Background during Private Relay → shutter, no spoiler
- Pause/resume preserves score, no duplicate commit
- Airplane mode: full run + local report queue still works

### Performance (record, then compare to `.designops/project.json` targets)

- Cold start seconds
- Cached first playable state seconds
- Subjective smoothness during active play

## After a complete dual-platform pass

1. Fill evidence hashes for artifact files.
2. Ask the owner for explicit handoff + release signature decisions
   (agents must not invent approvals or access reviewer private keys).
3. Only then assemble `.designops/native-verification.json` from
   `tools/designops/native-verification.example.json` bound to the verified
   commit and handoff approval digest.
4. Run `node tools/designops/enforce.mjs --intent release` and expect exit 0
   only when those records are real.
