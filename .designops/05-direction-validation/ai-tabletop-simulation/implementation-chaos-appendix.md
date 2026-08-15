# Deterministic implementation-chaos appendix

**Status:** Simulation-backed implementation evidence; not human evidence or release evidence.

The current reducer tests exercise safety properties that the qualitative matrix identifies as high-risk under distraction, noise, and alcohol-framed cognitive-load conditions. They prove only deterministic local behavior.

| Failure mode | Existing deterministic coverage | Required constraint |
| --- | --- | --- |
| Duplicate commits | `apps/mobile/src/domain/game.test.mjs` — duplicated answers | Ignore every answer after the round's first commit; score changes at most once. |
| Background interruption | `game.test.mjs` — background interruption | Room Beacon pauses only with role privacy preserved; Private Relay discards private turn state before any resume. |
| Private handoff leakage | `game.test.mjs` — private handoffs | Shutter before next player; conceal score and content; require an explicit ready action. |
| Malformed or withheld content | `game.test.mjs` — malformed/unapproved content | Non-playable state records never enter the round. |
| Corrupt deck | `game.test.mjs` — corrupt deck | End in content-unavailable, not a misleading game prompt. |
| Offline report flood | `game.test.mjs` — bounded report floods | Queue only minimised report payloads and retain the newest 100 records. |
| Event storm | `game.test.mjs` — 500-event action storm | Preserve reducer invariants under repeated actions; no duplicate score or unprotected state. |
| Rematch report attribution | `game.test.mjs` — rematched run report scope | Ignore `REPORT_*` when `runId` does not match the current run. |
| Live tilt subscribe failure | `useRoomBeaconMotion.test.tsx` — live subscribe throw | Disable tilt via `onUnavailable`; keep tap answers. |
| Hung font loader | `App.tsx` — `FONT_LOAD_TIMEOUT_MS` | Render with platform font fallbacks after the bound. |
| Content-unavailable recovery | `ContentUnavailableScreen` — BACK HOME | Offer an on-screen return-home recovery action. |
| Wedged playtest export | `App.tsx` export busy + `withTimeout` | Bound `Share.share`; prevent stacked sheets. |

These tests do not establish device accessibility, physical sensor behavior, party comprehension, readability, social safety, or performance. Those remain native-release and human-review requirements.

See also `apps/mobile/chaos-launch-audit-2026-08-12.md` for the 2026-08-12 audit verdict (not release evidence).
