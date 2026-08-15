# Chaos launch audit — 2026-08-12

**Status:** Client resilience audit and harden pass for the local-first Expo MVP.
This is **not** release evidence, signed handoff/release approval, or a
`.designops/native-verification.json` pass.

## Verdict

**Not launch-ready.** Deterministic chaos coverage is strong and this pass closed
several real client gaps, but release still requires:

1. Externally signed DesignOps handoff + release approvals
2. Hash-bound iOS **and** Android native verification with pass status for
   accessibility, sensors, lifecycle, offline, and performance
3. Human device observation for VoiceOver/TalkBack, large text, physical tilt,
   and measured cold start (see `native-verification-operator-runbook.md`)

Classic distributed chaos (network partition, Toxiproxy) does not apply: the MVP
has no in-app network, auth, or backend.

## What was already covered

Reducer `chaos:` tests in `src/domain/game.test.mjs` plus storage/sensor timeout
tests and the DesignOps appendix
`.designops/05-direction-validation/ai-tabletop-simulation/implementation-chaos-appendix.md`.

## Gaps closed in this pass

| Failure mode | Fix |
| --- | --- |
| Late report confirmation after rematch | Session `runId` scopes `REPORT_*` |
| Rematch skipped result suspense beat | Clear `revealedRound` on fresh runs |
| Live tilt subscribe throw crashed tree | try/catch + `onUnavailable` |
| Hung font loader blanked the UI | `FONT_LOAD_TIMEOUT_MS` fallthrough |
| Content-unavailable had no on-screen recovery | `BACK HOME` action |
| Wedged Share sheet latched export | `exportBusy` + `withTimeout` |

## Still open for launch (human / release gate)

- Device rows in `native-verification-checklist.md` (most still NOT OBSERVED)
- Signed reviews under `.designops/reviews/`
- `.designops/native-verification.json` bound to commit + handoff digest
- Authentic public-figure editorial pipeline (out of fixture MVP scope)

## How to re-run machine chaos

```bash
npm --prefix apps/mobile run test:unit
npm --prefix apps/mobile test
npm --prefix apps/mobile run export:ios
npm --prefix apps/mobile run export:android
node tools/designops/enforce.mjs --intent implementation --working-tree
```
