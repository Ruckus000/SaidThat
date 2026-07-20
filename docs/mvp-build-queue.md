# Cursor MVP build queue

**Authority:** This is the ordered execution queue for the owner-authorized, local-first fixture MVP. It supersedes conflicting “implementation blocked,” backend, public-content, and research prerequisites in older planning documents. It does not authorize a production release.

## Scope guardrails

- Work only under `apps/mobile/` unless a task explicitly changes an adjacent repository-owned test or policy file.
- Keep all playable cards local, fabricated or explicitly simulated-authentic fixtures, and visibly labeled. Do not use public-figure names, real-post text, images, source URLs, or editorial candidates in the app.
- No accounts, Supabase, public uploads, live social APIs, telemetry, ads, payments, or remote report delivery.
- Tap-only is a complete first-class route. Any sensor enhancement is optional and must preserve exactly-one-commit behavior and have deterministic fallback coverage.
- Do not call the MVP release-ready, accessible, validated, source-verified, or legally cleared.

## Definition of done for every task

1. Read `apps/mobile/AGENTS.md` and pass implementation enforcement before editing.
2. Make one focused change with no unrelated refactor.
3. Add or update deterministic tests for changed policy, reducer, storage, or UI-state behavior.
4. Pass typecheck, unit tests, and `(cd apps/mobile && npx expo export --platform ios --output-dir /private/tmp/said-that-ios-export)`.
5. Pass `node tools/designops/enforce.mjs --intent implementation --working-tree`.
6. Open a PR, complete code review and security review, and merge only when the policy workflow passes and review findings are resolved.

## Ordered tasks

| Order | ID | Focus | Completion evidence | Dependency |
| --- | --- | --- | --- | --- |
| 1 | MVP-01 | Move the semantic values from `.designops/08-design-system/tokens.json` into a small native token module and replace duplicated styling literals in `App.tsx`. | Typecheck; visual roles still map to token names; text-plus-shape status semantics retained. | None |
| 2 | MVP-02 | Separate presentation components from the reducer shell: Home, setup, active round, result, review, private shutter, paused, and unavailable states. | No game-state semantic change; component props are typed; existing chaos tests remain green. | MVP-01 |
| 3 | MVP-03 | Add deterministic UI-state tests for role labels, fixture disclosure, private-shutter score concealment, and unavailable-content recovery. | Tests cover each state in the demo specification without a device or network. | MVP-02 |
| 4 | MVP-04 | Add optional Room Beacon sensor input behind an explicit opt-in, calibration, and immediate tap fallback. | Unit-tested neutral/debounce/idempotence behavior; no sensor permission or event can reveal the holder card or duplicate a score. | MVP-03 |
| 5 | MVP-05 | Add a local settings surface for reduced motion, no motion, and reset-local-session/report queue. | Tap-only remains complete; reset clears only local session/report data with confirmation; state tests added. | MVP-03 |
| 6 | MVP-06 | Expand the bundled fixture deck with original non-public-figure prompts and deterministic deck validation/rotation coverage. | Every record is fixture-only; withheld records remain unplayable; no real claim or source enters the bundle. | MVP-03 |
| 7 | MVP-07 | Add Android export smoke coverage and a manual native verification checklist template for later release evidence. | `expo export` succeeds for iOS and Android; checklist makes no pass claim. | MVP-04, MVP-05 |

## Stop conditions

Stop and report instead of improvising if work would add a networked backend, account, public content, real-person attribution, production analytics, a remote delivery endpoint, or a release claim. Those are outside this MVP authorization.
