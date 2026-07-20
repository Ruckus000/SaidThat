# Comprehensive UX/UI Plan

**Status:** Draft strategy plan  
**Date:** 2026-07-18  
**Scope:** Phase 0 validation prototype through Phase 1 MVP  
**Decision boundary:** This plan defines experience requirements, validation, states, artifacts, and gates. It deliberately does not select visual styles, fonts, colors, layouts, or components.

## 1. Planning review: what exists and what is missing

The repository already provides unusually strong inputs for product scope, gameplay rules, legal and platform risk, content operations, architecture, analytics, testing, accessibility features, and delivery sequencing. The missing UX/UI layer is the connective tissue between those decisions.

| Existing strength | Missing UX/UI contract |
|---|---|
| Clear party-game positioning and MVP exclusions | Role-based experience model for holder, visible group, pass-and-play player, and content reviewer |
| Core gameplay loop and screen list | End-to-end journeys with entry, interruption, recovery, empty, offline, stale-content, and report states |
| Accessibility feature checklist | Equivalent task paths, acceptance criteria, device scripts, and disabled/sensor-unavailable behavior |
| Legal and moderation rules | Trust model for pre-answer ambiguity, post-answer truth, source status, disputed cards, and screenshot leakage |
| Analytics taxonomy and success metrics | Instrumented UX hypotheses and a research plan linking behavior to design decisions |
| Technical and performance targets | Perceived-performance behavior and continuity requirements at each critical transition |
| Draft visual tokens | Evidence-backed direction criteria and a gated path to Design DNA and tokens |

The most important correction is to stop treating `docs/ux-spec.md` as implementation-ready. Its screen inventory and accessibility notes are useful requirements. Its visual tokens, font examples, palette, gradients, radius, and stylistic prohibitions are unvalidated solution hypotheses.

## 2. UX objective

Enable a group with one phone to understand the game, start a round, make rapid unambiguous guesses, recover from control or connectivity problems, learn what was authentic, and choose to rematch—without facilitator help, account setup, or loss of trust.

The experience must preserve three qualities simultaneously:

1. **Tempo:** setup and transitions do not drain the room's energy.
2. **Legibility:** the visible group can read and act from real party distances and conditions.
3. **Trust:** uncertainty is fun before the answer; truth is unmistakable after the answer.

## 3. Experience roles and contexts

| Role/context | Required outcome | Key risk |
|---|---|---|
| Session starter | Gets a group from launch to first answer with minimal explanation | Mode/deck/setup decisions become a lobby |
| Forehead holder | Knows how to hold, tilt, pause, and recover without seeing the screen | Control ambiguity or accidental answers |
| Screen-facing group | Reads the card quickly and participates socially | Text unreadable at distance; attribution ambiguity |
| Pass-and-play player | Completes the same judgment task privately and hands off cleanly | Spoilers, ownership confusion, score errors |
| Screen-reader or tap-only player | Completes a full round through an equivalent path | Accessibility treated as degraded fallback |
| Content reviewer/reporter | Understands the truth state and can flag a problem without losing progress | Reporting breaks the party flow |
| Editorial operator | Previews real game constraints, validates source/safety, and removes content | Content that passes schema but fails in play |

No demographic persona is invented here. The planning documents identify 18–28 friend groups as the intended launch audience, but no direct user study yet validates that segment, its contexts, or its accessibility needs.

### Role and answer-agency contract

- In **forehead play**, the holder cannot see or hear the active statement. The screen-facing group reads it, discusses it, and relays its collective judgment; the holder makes the single physical commit by tilt or tap. The round earns one **group** result, never an individual holder score.
- In **pass-and-play**, the active player privately receives the statement, makes the judgment, owns the resulting player or team score, and must receive a protected handoff before the next player sees any prior card or outcome.
- An accessibility path preserves the same role and score semantics. It must not reveal the active forehead card to its holder through a screen reader, audio route, haptic, or handoff announcement. A participant who needs screen-reader access may be the screen-facing reader/group contributor in forehead play or use pass-and-play; the study must test both role assignments.
- Every role instruction names: who can perceive the statement, who is permitted to commit an answer, whose score changes, and what information must remain private until review.

## 4. Critical journeys

### Journey A — First party round

`Launch → choose party play → choose available deck → control readiness → brief instruction → countdown → answer loop → results → reveal/review → rematch`

Required behavior:

- No account, permission wall, download surprise, or settings tour before the value proposition is understood.
- Motion readiness is checked before countdown, with a clear tap path that preserves the same game.
- The holder and visible group receive role-appropriate instructions.
- The answer loop exposes only information required for the current decision.
- Results prioritize the next social decision: rematch, review, or stop.

### Journey B — Pass-and-play match

`Launch → choose pass-and-play → configure minimal roster → choose deck/rounds → player handoff → private answer loop → protected transition → scoreboard → next player → final result/rematch`

Required behavior:

- Roster setup must not outweigh the play session.
- The handoff state prevents the next player from seeing the previous player's outcome or the prior card unexpectedly.
- Ownership of the next action and score attribution is always explicit.

### Journey C — Control failure and recovery

`Readiness check or active round → sensor unavailable/unstable/ambiguous → preserve session state → offer tap path and retry → resume without duplicate answer`

Required behavior:

- Recovery never silently changes the registered answer.
- A control-mode change is explained in plain language and can be reversed later.
- Active-round state survives backgrounding, orientation change, and accidental interruption according to a defined policy.

### Journey D — Truth review and content report

`Round result → card review → explicit truth state → explanation/source status → report reason → confirmation/local hide option → return to same review position`

Required behavior:

- “Authentic,” “fabricated for the game,” “source unavailable,” “disputed,” and “removed” are distinct content states.
- A report never converts an unresolved claim into a factual judgment.
- Returning from source or report actions preserves the user's place.

### Journey E — Offline and stale content

`Launch offline → show playable cached/bundled content → start round → queue report if needed → reconnect → reconcile manifest/tombstones → explain material catalog changes`

Required behavior:

- Network loss does not block a bundled or cached round.
- Removed or disabled content is not reintroduced by stale cache rules.
- The experience distinguishes “not downloaded,” “download failed,” “corrupt,” “update available,” and “removed.”

## 5. Screen and state architecture

The current screen inventory is a useful starting point, but each surface needs a content-state contract before visual design.

| Surface | Normal purpose | Required non-normal states |
|---|---|---|
| First-run readiness | Explain value and establish usable control path | skipped, screen reader active, sensor unavailable, permission denied, preference changed |
| Home/start | Start the highest-value task | first run, no playable deck, offline with bundled deck, update notice, catalog disabled |
| Mode choice | Choose social format with consequences understood | motion not available, accessibility recommendation, format deferred |
| Deck choice | Select safe, playable content | bundled, downloaded, updating, unavailable offline, corrupt, removed, age/sensitivity restricted |
| Player setup | Establish pass-and-play ownership | minimum players unmet, duplicate names, teams off/on, resume interrupted setup |
| Round readiness | Confirm role, grip, control, and orientation | calibration required, tap chosen, audio/haptics off, resume after interruption |
| Countdown | Synchronize the group | pause/cancel, reduced motion, audio disabled |
| Active card | Support one fast judgment | last seconds, paused, backgrounded, orientation mismatch, sensor degraded, answer committing, timeout |
| Results | Close the round and invite the next action | no answered cards, interrupted round, analytics unavailable, share unavailable |
| Review | Establish truth and support correction | authentic, fabricated, disputed, source unavailable, removed, report pending, report sent |
| Scoreboard/handoff | Preserve fairness and turn ownership | tie, incomplete round, next-player privacy transition, final round |
| Settings | Change preferences without surprises | OS-controlled value, unavailable capability, reset, privacy consent absent |
| Report | Capture actionable safety/content issue | offline queued, duplicate, submission failure, rate limited, legal/harm priority |

The formal content-state map is a handoff artifact and remains draft until direction selection.

## 6. Interaction principles

These are requirements, not layout prescriptions.

- One consequential decision at a time during setup and active play.
- Always expose the current actor, current task, and consequence of the next action.
- Treat tilt and tap as equivalent task paths with shared scoring and feedback semantics.
- Never use color, motion, haptics, or audio as the only carrier of meaning.
- Require a neutral/recovery state between motion answers to prevent duplicate commits.
- Preserve round state across recoverable interruption; confirm destructive exits.
- Put truth disclosure after the guess and make it semantically explicit.
- Keep report and source actions available without forcing them into the timed loop.
- Avoid manipulative retention, punitive copy, and public-figure “gotcha” framing.

## 7. Content and trust plan

### Before an answer

- Present only the statement, attributed identity, time/round status, required control affordance, and a persistent content-neutral **game-round context marker**.
- Do not imply verification through platform chrome, account badges, screenshots, or news-like framing.
- Do not expose authenticity, source metadata, or an editorial confidence signal.

The context marker must survive ordinary screenshots, recordings, and photographs of every pre-reveal state without implying either authenticity outcome. Direction research must test this with capture review, not just an in-app share surface.

### After an answer

- State the editorial truth classification in words.
- For authentic content, expose the allowed source status and explanation.
- For fabricated content, state that it was made for the game.
- For disputed or removed content, stop presenting a binary truth claim and explain the status.
- Keep reporting available and return the user to their prior context.

### Truth-state transition rules

- **Authentic** means editorial review has retained an eligible source record for the attributed statement; it may be played and revealed as authentic.
- **Fabricated for the game** means an editorially approved game decoy, never a claim that was published by the attributed person; it may be played and must be revealed with that meaning in words.
- **Disputed** means credible evidence conflicts or editorial review cannot resolve the claim; it is not playable as a binary card and must stop any existing binary presentation.
- **Source unavailable** means a previously eligible source cannot currently be shown. It is not playable until editorial review restores an eligible source or removes it; review history may describe the availability problem without asserting authenticity.
- **Removed** means a card was withdrawn for rights, safety, factual, or policy reasons. It is never playable, must supersede cached play when a tombstone is available, and may only appear in history with its removal status.

These are product-semantic requirements, not a substitute for legal or editorial clearance.

### Representative content requirement

Design exploration must use realistic statement lengths, difficult attributions, sensitive-but-allowed examples, source-unavailable cases, removed cards, and low-connectivity states. Placeholder copy is insufficient for evaluating this product.

## 8. Accessibility plan

Target WCAG 2.2 AA where applicable to native mobile semantics, plus platform-native iOS and Android accessibility expectations.

Required acceptance paths:

- Complete one full party round with tap-only controls.
- Complete one full pass-and-play round with VoiceOver and TalkBack scripts.
- Preserve forehead information asymmetry: a holder's screen reader, audio route, haptic, and handoff announcement must not disclose the active card; test a screen-reader participant both as a screen-facing contributor and in private pass-and-play.
- Understand correct/incorrect and authentic/fabricated without color.
- Complete setup and recover from a sensor failure without motion, audio, or haptics.
- Keep setup, handoff, reveal, review, report, pause, and recovery non-time-limited. For the timed answer mechanic, provide a pre-round extended-timer or untimed accessibility option with equivalent answer, score, and truth-review semantics.
- Use platform text-size settings without hiding the primary action or truth label.
- Pause and exit with predictable focus restoration.
- Maintain touch targets of at least 48 dp for game controls.
- Respect Reduce Motion for animation while keeping tilt as an independently controlled input preference.
- Test glare, low light, noise, one-handed use, forehead distance, and several-feet group reading.

Accessibility is a design input in territory comparison, not a post-handoff audit.

## 9. Research and validation plan

### Stage 1 — Problem framing review

Review this strategy against the product, gameplay, content, legal, and technical owners. Confirm that the roles, tasks, trust boundary, and high-risk assumptions are correctly framed. Because high-risk core assumptions exist, this strategy requires explicit signed review before creative territories.

### Stage 2 — Phase 0 behavioral study

Use a paper or neutral low-fidelity prototype with representative cards and **8–12 group sessions**. This is a behavioral go/no-go study, not a territory comparison. Record the group as the unit for shared-play outcomes and each participant as the unit for individual comprehension outcomes. The product owner decides whether results support Phase 0 continuation; the research lead owns the protocol; the accessibility lead owns accessible-task acceptance; and the editorial owner approves study cards.

Define before recruiting: a *valid first answer* is one committed answer after the prepared prompt without moderator explanation; *assistance* is any moderator clarification beyond that prompt; and a *recovered control failure* is a failure followed by one intended answer without restart or duplicate commit. Capture:

- time and assistance needed to first valid answer;
- whether holder and visible group understand their different roles;
- completed rounds and rematch choice;
- control errors, accidental answers, and recovery success;
- reading failures by distance, statement length, attribution, and environment;
- truth-label misunderstanding and screenshot/deception concerns;
- accessibility-path completion and preference.

Purposefully recruit people who regularly use screen readers and non-motion controls, report their task outcomes separately, and do not substitute a sighted evaluator script for participant evidence.

Do not report “laughs per minute” or demographic fit as fact unless an agreed observation protocol is used.

### Stage 3 — Direction comparison

Create exactly three materially divergent territories against the same content, tasks, states, and hard criteria. Select one candidate and one countermodel. This is a separate comparison with **at least six moderated group sessions**, counterbalanced territory order, the same predeclared fixture, and separate group and individual denominators. Because primary-task, trust, safety, and interaction assumptions are high risk, direction approval requires a pre-signed independent-study plan, thresholded kill criteria, completed participant records, and signed review. A solo walkthrough remains hypothesis-only.

### Pre-direction comparison fixture

Before territories exist, the research lead and editorial owner must freeze one solution-neutral fixture. It includes short, median, and maximum-length statements; difficult attributions; authentic, fabricated, disputed, source-unavailable, and removed records; active pre-reveal, result, review, report, queued-report, offline, loading, corrupt, sensor-failure, background, orientation, timeout, and handoff states; forehead, tap-only, pass-and-play, screen-reader, reduced-motion, no-audio, and no-haptic paths; and the agreed device, distance, lighting, noise, and capture conditions. Territories may change expression and composition, never the fixture’s tasks, semantics, or pass/fail conditions.

### Stage 4 — Handoff validation

Validate the selected direction through content-state coverage, Design DNA, tokens, component behavior contracts, realistic content pressure tests, accessibility review, and implementation feasibility with the Expo team.

### Stage 5 — Implemented verification

The DesignOps 0.2 lane matrix does not qualify Expo/React Native browser verification. Project-owned native verification must therefore cover iOS and Android builds, VoiceOver/TalkBack, physical sensors, orientation, lifecycle, offline behavior, performance, and critical tasks. Machine checks do not replace explicit human review of party dynamics, readability, trust, and visual craft.

## 10. Measurement plan

| Question | Behavioral evidence | Decision use |
|---|---|---|
| Can groups start unaided? | assistance count, time to first valid answer, setup abandonment | simplify or reorder setup |
| Is the control model reliable? | accidental answers, duplicate commits, fallback rate, recovery completion | keep, revise, or demote tilt |
| Is content readable in context? | first-read success by distance/length/environment | set content and typography constraints at handoff |
| Is truth understood? | post-reveal classification explanation and eligibility misunderstanding | revise reveal semantics or block direction |
| Does the group want another round? | observed rematch choice after completed round | Phase 0/1 go-no-go |
| Does accessibility preserve the game? | equivalent task completion and preference | reject non-equivalent territory |
| Does reporting preserve context? | report completion and return-to-review success | revise report journey |
| Is the audience hypothesis supported? | Phase 0 group completion/rematch against the predeclared segment and protocol | continue, revise, or stop the launch-segment hypothesis |

Product metrics remain: at least 70% of Phase 0 groups complete two or more rounds unaided, control usability at least 80%, Phase 1 rematch rate at least 40%, round completion at least 75%, and crash-free sessions at least 99.5%. These are stakeholder-defined thresholds, not achieved results.

## 11. Design deliverables and gates

| Phase | Deliverables | Machine checks | Explicit human review |
|---|---|---|---|
| Strategy | manifest, evidence brief, experience strategy, typed requirements registry | schema, requirements, provenance | required here because core high-risk assumptions exist |
| Direction | exactly three territories, selection record, precommitted validation plan/results | divergence, selection, evidence references, validation structure | signed direction decision after kill criteria remain clear |
| Handoff | content-state map, Design DNA, tokens, proposal specification | state coverage, token contract, anti-slop/evidence checks | signed system and feasibility review |
| Implementation | native app and project-owned task tests | repository CI, unit/component/E2E, content schemas | design QA on devices and real content |
| Verification | current fingerprint and native verification evidence | native task, accessibility, offline, performance, lifecycle checks | human usability, trust, readability, and craft review |
| Release | current implementation identity and approvals | freshness/provenance and project release checks | signed final attestation |

### LaunchPad 0.2 gate contract

The four executable profiles are `strategy`, `direction`, `handoff`, and `release`, within the wider sequence `strategy → direction → handoff → implementation → verification → release`.

- `strategy` requires the manifest, evidence brief, experience strategy, and exact evidence/requirements registry.
- `direction` adds exactly three territories, selected direction, and risk-triggered validation evidence.
- `handoff` adds Design DNA, tokens, content states, and the applicable proposal specification.
- `release` requires current handoff approval, project fingerprint, implementation identity, and project verification when implemented UI is in scope.

Gate exit codes are contractual:

- `0` — approved;
- `1` — blocked by a quality failure;
- `2` — deterministic checks pass but explicit review is required;
- `3` — gate, configuration, or checker failure.

Lane capability is bounded. LaunchPad 0.2 qualifies browser fixtures for Next.js/Tailwind, Vite/React, WordPress, and Laravel only, and each qualification is limited to configured routes and documented backend/auth/plugin boundaries. Expo/React Native is not a qualified lane. This strategy therefore uses artifact-only verification now and requires project-owned native iOS/Android evidence before any implemented release claim.

## 12. UX/UI backlog additions

Before Phase 0 implementation:

1. Confirm strategy framing and high-risk assumption ownership.
2. Define the Phase 0 research protocol, observation sheet, representative-card set, and accessible alternatives.
3. Story-map the first party round, pass-and-play handoff, control recovery, truth review/report, and offline journey.
4. Define state-transition and data-minimization policy for pause, background, orientation, sensor loss, timeout, exit, analytics, and queued reports.
5. Define content length and attribution test fixtures rather than committing typography values early.
6. Define semantic labels and copy tests for authentic, fabricated, disputed, removed, queued report, and offline status.

Before Phase 1 implementation:

7. Produce three creative territories and run required direction validation.
8. Create the formal content-state map and component behavior inventory.
9. Derive Design DNA and tokens from the selected direction.
10. Create a proposal specification that maps every critical task and state to acceptance evidence.
11. Add native accessibility, sensor, offline, interruption, and realistic-content tests to the release matrix.
12. Run device design QA at representative phone sizes and party contexts before store submission.

## 13. Decisions and evidence still required

- Direct evidence that the intended groups understand and enjoy the forehead authenticity loop.
- Whether forehead mode remains the defining interaction if tap is preferred or motion fails.
- Counsel-reviewed fabrication, naming, source, screenshot, and disclosure patterns.
- Accountable editorial owner and sustainable content capacity.
- Representative source-rights pattern for authentic cards.
- Launch markets, languages, age rating, and consent requirements.
- Final Phase 0 thresholds and owners for interpreting the results.
- The product owner's explicit Phase 0 audience-segment go/no-go decision, based on the registered protocol and thresholds.
- Expo/React Native implementation verification plan outside the plugin's qualified browser lanes.

## 14. Next artifact

After explicit strategy framing review, create the direction-validation plan and exactly three creative territories using the predeclared criteria in `03-requirements-map.json`. Do not convert the existing token suggestions into UI before this gate.
