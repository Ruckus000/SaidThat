# Cursor MVP build queue

**Authority:** This is the ordered execution queue for the owner-authorized, local-first fixture MVP. It supersedes conflicting “implementation blocked,” backend, public-content, and research prerequisites in older planning documents. It does not authorize a production release.

## Scope guardrails

- Work only under `apps/mobile/` unless a task explicitly changes an adjacent repository-owned test or policy file, or is part of the build-time content pipeline under `tools/content-pipeline/`.
- Keep all playable cards local and visibly labeled. **Amended 2026-08-04 (owner decision):** curated public-figure cards may now ship in the bundle, replacing the earlier prohibition on public-figure names, real-post text, source URLs, and editorial candidates. They are admitted only through `tools/content-pipeline/`, which requires Tier A/B provenance with two independent citations, a retained https source record, two distinct editorial approvals, and a clean pass of the safety, read-aloud, composition and tell-leakage gates. Fixture-only dev records remain in the bundle behind the existing `__DEV__` gate and are still fixture-only. Images and profile photos remain excluded.
- Fabricated cards stay labeled as fabricated on reveal, and the reveal must keep `SIMULATED AUTHENTIC` distinct from `AUTHENTIC`. No content change may collapse those.
- No accounts, Supabase, public uploads, live social APIs, telemetry, ads, payments, or remote report delivery.
- Tap-only is a complete first-class route. Any sensor enhancement is optional and must preserve exactly-one-commit behavior and have deterministic fallback coverage.
- Do not call the MVP release-ready, accessible, validated, source-verified, or legally cleared.

## Definition of done for every task

1. Read `apps/mobile/AGENTS.md` and pass implementation enforcement before editing.
2. Make one focused change with no unrelated refactor.
3. Add or update deterministic tests for changed policy, reducer, storage, or UI-state behavior.
4. Pass typecheck, unit tests, and both platform exports — `(cd apps/mobile && npx expo export --platform ios --output-dir /private/tmp/said-that-ios-export)` and `(cd apps/mobile && npx expo export --platform android --output-dir /private/tmp/said-that-android-export)`.
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

## Curated-content queue (added 2026-08-04)

Ordered tasks for the content pipeline and the cards it produces. `MVP-11` is a hard gate: no public-figure content may reach `apps/mobile/` before it passes.

| Order | ID | Focus | Completion evidence | Dependency |
| --- | --- | --- | --- | --- |
| 8 | MVP-08 | Build `tools/content-pipeline/` — schema, provenance tiers, read-aloud, safety, composition and tell-leakage gates, with the candidate corpus ported as `draft`. | `node --test tools/content-pipeline/test/*.test.mjs` green; `validate.mjs` exits non-zero on the raw corpus. | None |
| 9 | MVP-09 | Editorial pass: break same-figure pairs, re-source to Tier A/B, rewrite decoys, distinct explanations, reach the pool floor. | `validate.mjs --deck pop-voices` exits 0; leave-one-out leakage at or below 0.58 with no exclusive class marker. | MVP-08 |
| 10 | MVP-10 | Accept `contentState: "authentic"` in `validateDeck.js`, add tombstone precedence. | A well-formed authentic record validates; one without a retained https source does not; `game.test.mjs` unchanged. | MVP-08 |
| 11 | MVP-11 | Emit the runtime bundle from editorial records and merge it with the existing fixtures in `catalog.js`. | Emitter covers every derivation-table row; `build.mjs --check` reports no drift; both platform exports succeed. | MVP-09, MVP-10 |
| 12 | MVP-12 | Report the real source record on reveal and disclose AI-assisted decoys. | `SIMULATED AUTHENTIC` and `AUTHENTIC` remain distinct strings; disclosure renders for `ai_assisted`. | MVP-11 |
| 13 | MVP-13 | Replace deck shuffling with a seeded run-builder honouring the slot shape and variety constraints. | Same seed yields an identical run; no repeated figure; no three consecutive identical answers; reducer stays pure. | MVP-10 |
| 14 | MVP-14 | Capture local playtest calibration and export it for editorial import. | Verdict thresholds tested at each boundary; export payload asserted to carry no identity fields; no network path. | MVP-13 |

## Stop conditions

Stop and report instead of improvising if work would add a networked backend, account, public user-generated content, production analytics, a remote delivery endpoint, or a release claim. Those are outside this MVP authorization.

Real-person attribution is **no longer** a stop condition, but it is gated: it is authorized only through `tools/content-pipeline/` and only for cards that pass every gate. Hand-editing a public-figure card directly into `apps/mobile/src/content/` bypasses provenance, safety and approval checks and remains a stop condition.
