# Native verification run — 2026-08-12

**Status:** Machine-checkable rows only. This is **not** evidence of a pass, iOS
or Android verification, accessibility conformance, or release readiness.
Device rows remain **NOT OBSERVED**. This file is a working log, not a
sign-off, and it is **not** `.designops/native-verification.json`.

**Companion:** [`native-verification-operator-runbook.md`](native-verification-operator-runbook.md)
for the human device matrix. Audit verdict:
[`chaos-launch-audit-2026-08-12.md`](chaos-launch-audit-2026-08-12.md).

**Template:** [`native-verification-checklist.md`](native-verification-checklist.md).

| Field | Value |
| --- | --- |
| Commit | `a2094bf5fadf413f70a8b69e7d3022c8d35d2729` |
| `DECK_VERSION` | `0.3.0` |
| Operator | Cloud agent for machine-checkable rows only |

## Preconditions

- [x] Build from a commit intended for verification — `a2094bf5fadf413f70a8b69e7d3022c8d35d2729`
- [x] Fixture-only deck loaded (`DECK_VERSION` recorded) — `0.3.0`
- [x] No network, account, or telemetry dependencies enabled — unchanged from prior audit; local-first MVP

## iOS smoke export

- [x] Command exits 0 — `npm --prefix apps/mobile run export:ios`
- [x] Bundle artifact path: `/tmp/said-that-ios-export`

## Android smoke export

- [x] Command exits 0 — `npm --prefix apps/mobile run export:android`
- [x] Bundle artifact path: `/tmp/said-that-android-export`

## Accessibility / sensors / lifecycle / offline / performance

All device-observation rows: **NOT OBSERVED** in this environment. Follow the
operator runbook on physical iOS and Android hardware before any release claim.

## Deterministic chaos (not native evidence)

- [x] `npm --prefix apps/mobile run test:unit` — pass
- [x] `npm --prefix apps/mobile test` — 127 tests pass
- [x] `node tools/designops/enforce.mjs --intent implementation --working-tree` — exit 0
