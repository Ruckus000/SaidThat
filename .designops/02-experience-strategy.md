# Experience Strategy

**Status:** Draft  
**Date:** 2026-07-18  
**Phase:** Strategy

## 1. Specificity thesis

This is a one-phone social guessing ritual about recognizing a public figure's voice, and it should be memorable for the room's shared moment of confident uncertainty followed by an unmistakably truthful reveal—not for resembling a social feed, a news product, or a generic trivia app.

**Evidence:** `source:product-brief`, `source:gameplay-spec`, `source:content-operations`, `source:legal-risks`, `task:judge-card`, `task:understand-reveal`  
**Decision rationale:** The product's differentiated value is the social ritual and authenticity judgment. Its largest safety risk is false attribution. The experience must therefore maximize participation before the answer and certainty after it.

## 2. Problem framing

### Verified repository facts

- The repository contains planning documents and an early Expo/React Native scaffold in `apps/mobile`; the implementation gate prohibits expanding it while Strategy review is unresolved.
- The project detector finds no supported **qualified browser** implementation family or styling system. Expo/React Native remains outside LaunchPad's qualified browser lanes.
- The documents define Phase 0 and Phase 1 scope, requirements, target metrics, and unresolved decisions.

### Stakeholder-defined product inputs

- Party game first; one phone; forehead and pass-and-play formats; Real or Fake only for MVP.
- No account, live X dependency, public UGC, profile photos, or monetization during validation.
- Editorial content, harmless decoys, truth labeling, reporting, offline play, and content removal are required.
- The proposed launch audience is 18–28 friend groups and party-game players.
- Rematch is the primary product behavior to validate.

### Assumptions

- The planned audience values this exact mechanic and context.
- Forehead play increases social energy enough to justify motion complexity.
- Representative content is readable and understandable at party distance and pace.
- Truth labeling can recover the trust intentionally suspended during the guess.
- Equivalent non-motion paths can retain the game's defining social value.

### Open questions

- Legal and brand clearance, allowed source/storage patterns, and store disclosure requirements.
- Whether forehead mode survives Phase 0 evidence or becomes secondary to tap/pass-and-play.
- Sustainable editorial ownership, capacity, and quality.
- Launch markets, language, content rating, and privacy/analytics consent.
- Native verification strategy for an Expo/React Native implementation.

## 3. Primary users and roles

The primary design unit is the **group session**, not an individual profile. Within it, the interface must coordinate:

1. the person starting and configuring the session;
2. the forehead holder who cannot see the screen;
3. group members who can see, read, and react;
4. the active pass-and-play player when that format is used;
5. players who require tap, screen-reader, reduced-motion, no-audio, or no-haptic paths.

The secondary operational user is the editorial operator responsible for source records, safety review, realistic preview, publishing, reporting, and removal.

Demographic persona details beyond the repository's proposed audience are intentionally absent.

### Role and information contract

In forehead play, the screen-facing group sees, reads, and discusses the active statement; the holder cannot perceive it and makes the one physical answer commit by tilt or tap. The result is a group score. In pass-and-play, the active player privately sees and commits the answer, owns the player or team score, and receives a protected handoff before another player can see prior content or outcome.

Equivalent access preserves this contract: a holder must not receive the active statement through VoiceOver, TalkBack, audio routing, haptic, or handoff copy. A screen-reader user can participate as the screen-facing reader/group contributor in forehead play, or play the private pass-and-play role. Every instruction must identify who can perceive the card, who can commit, whose score changes, and what remains private until review.

## 4. Highest-value tasks

### Primary

- `task:start-round` — reach a valid first answer with minimal explanation or setup.
- `task:judge-card` — read, discuss, and register exactly one intended authenticity guess under time pressure.
- `task:recover-control` — continue through motion, sensor, orientation, interruption, or connectivity failure.
- `task:understand-reveal` — know what was authentic or fabricated and why the product is trustworthy.
- `task:continue-session` — rematch or hand off without losing pace, score, or turn ownership.

### Secondary

- choose and manage playable content;
- set up local players or teams;
- inspect a source or explanation;
- report a content problem and return to context;
- adjust accessibility and control preferences;
- editorially preview, approve, publish, and remove content.

## 5. Emotional requirement

The desired emotional sequence is:

`immediate invitation → confident speculation → social reaction → surprising clarity → desire for another round`

The experience should feel energetic, inclusive, and lightly mischievous. It must not make a player feel stupid, punish unfamiliarity with a celebrity, or turn fabricated claims into a “gotcha.” Safety and truth language must remain calm and direct even when the surrounding game is lively.

## 6. Trust posture

Trust is deliberately asymmetric:

- **Before the guess:** the product withholds authenticity so uncertainty can power the game.
- **After the guess:** the product must remove ambiguity through explicit language, explanation, source status, and report access.

Trust requirements:

- no platform chrome, verified badges, screenshots, or news-like treatments that imply a fabricated statement is authentic;
- no result or share artifact that can detach a fabricated quote from its game labeling;
- every pre-reveal state has an always-present, content-neutral game-round context marker that remains visible in ordinary capture without revealing authenticity;
- authentic, fabricated, disputed, removed, and source-unavailable states are semantically distinct;
- source links and editorial records support trust but are not represented as infallible;
- reports preserve context, acknowledge offline queuing, and do not imply an instant factual ruling;
- content removal and tombstones take precedence over stale local content when updates are available.

Content-state semantics are fixed before direction: authentic cards have an eligible retained source record and may be played; fabricated-for-game cards are approved decoys and must be labeled in words on reveal; disputed cards are not playable as binary claims; source-unavailable cards are paused from play until editorial review restores a source or removes them; removed cards are never playable and supersede cached content when a tombstone is available. These requirements do not constitute legal clearance.

## 7. Content hierarchy

### Setup

1. What kind of play is starting.
2. What content is playable now.
3. Who acts next.
4. What control method is active and whether it is ready.
5. Optional settings only when they affect success.

### Timed decision

1. Statement text.
2. Attributed identity.
3. Remaining time and round status.
4. Available answer/pause controls appropriate to the active role.

### Post-answer and review

1. Truth classification in words.
2. The player's result.
3. Explanation and allowed source status.
4. Report/source actions.
5. Next social action: continue, rematch, hand off, or stop.

This hierarchy is semantic. Territory work may explore composition only after the strategy gate.

## 8. Operational constraints

- Phase 0 uses bundled editorial content and may have no backend.
- Phase 1 must support downloaded decks, offline rounds, manifest reconciliation, kill switches, tombstones, and queued reports.
- No player accounts are required in Phase 0–1.
- Content volume is 50–150 cards in one Phase 0 deck and 400–800 cards across 3–5 Phase 1 decks.
- A two-person editorial rule applies to public-figure cards.
- Legal/harm reports have a shorter target SLA than routine reports.
- The app must not depend on live X content or upload raw motion streams.
- Phase 0 debug logging is local-only. Any future analytics must minimize data to the documented event/card identifiers, exclude raw motion streams, statements, names, source URLs, session transcripts, and free-text by default, and follow the later consent/retention decision.
- A queued report contains only the card identifier, reason category, app/deck version, and timestamp by default; it does not contain player identity, session transcript, raw motion, or free text unless a later reviewed policy explicitly changes that contract.
- Realistic content and failure states must be available to design and QA; schema-valid happy paths are insufficient.

## 9. Accessibility expectations

- Meet WCAG 2.2 AA where applicable and native platform semantics.
- Provide complete tap-only and no-motion paths with equivalent scoring and session completion.
- Support VoiceOver and TalkBack through setup, round, result, review, and report.
- Preserve spoiler boundaries for the forehead holder across screen-reader output, audio routing, haptic, and handoff states; validate that a screen-reader participant can contribute in the screen-facing role and complete a private pass-and-play round.
- Do not encode meaning only in color, motion, haptics, or audio.
- Respect platform text settings and Reduce Motion without conflating animation preference with tilt availability.
- Maintain at least 48 dp game-control targets.
- Restore focus and context after pause, errors, source links, and reports.
- Keep setup, handoff, reveal, review, report, pause, and recovery untimed. The answer mechanic must offer an extended-timer or untimed accessibility setting selected before a round, with the same answer, score, and review semantics.
- Validate at distance, glare, low light, noise, orientation change, and real device motion.

## 10. Performance and continuity expectations

- Cold start under 2.5 seconds; cached first playable state under 5 seconds.
- Active play targets 60 fps and sensor answer processing under 50 ms plus debounce.
- A cached or bundled round works fully offline.
- A deck package remains under 1.5 MB per 150 cards.
- Ten rematches do not create memory growth.
- Phase 1 targets at least 99.5% crash-free sessions.

Perceived performance requirement: every wait that can interrupt group energy must expose whether the user can play, retry, use cached content, or leave safely.

## 11. Evaluator questions

Before approving strategy framing:

- Are the group roles and task priorities faithful to the intended product?
- Is the boundary between playful uncertainty and factual truth explicit enough?
- Are high-risk assumptions and unknowns honestly represented?
- Are accessibility paths treated as equivalent ways to play?
- Does the plan avoid solving legal questions through visual design?

Before selecting a direction:

- Can participants begin and complete the primary task with representative content?
- Can both the holder and visible group explain their roles and controls?
- Does the direction preserve reading, timing, and truth understanding across required states?
- Does it remain specific to this social ritual without imitating a social feed or news interface?
- Does it work across tap-only, screen-reader, reduced-motion, offline, and error conditions?

Before implementation:

- Are content states, behavior contracts, Design DNA, tokens, and proposal requirements current and mutually consistent?
- Has counsel supplied the decisions that affect naming, content, source, disclosure, and sharing behavior?
- Can the Expo team test critical tasks on iOS and Android despite the absence of a qualified LaunchPad browser lane?

## 12. Direction criteria

Every territory must use the same representative content and be compared on:

- time and assistance to first valid answer;
- group reading success at representative distance and content length;
- role and control comprehension;
- accidental-answer prevention and recovery;
- truth-label comprehension and screenshot safety;
- capture safety for every active pre-reveal state, not only a dedicated share surface;
- equivalent task completion for non-motion and screen-reader paths;
- pace through results, handoff, and rematch;
- offline/error-state clarity;
- subject specificity without social-feed or news imitation;
- feasibility within Expo performance and content constraints.

Exact criteria, measurements, and references are registered in `03-requirements-map.json` before territories exist.

## 13. Validation and kill posture

High-risk assumptions affecting the primary task, interaction model, safety, trust, and content structure require direction-stage validation. A solo formative walkthrough may identify issues but cannot approve a direction. The Phase 0 behavioral study is 8–12 group sessions and owns the audience-segment go/no-go; the separate direction comparison uses at least six moderated group sessions, a selected candidate and countermodel, counterbalanced ordering, a frozen common fixture, explicit thresholds, completed group and participant records, and signed human review. The research lead owns the protocol, the accessibility lead owns accessible-task acceptance, the editorial owner approves study cards, and the product owner records the go/no-go decision.

Examples of kill conditions include repeated unaided-start failure, unrecovered control failure, persistent truth-label misunderstanding, non-equivalent accessible task completion, and representative content that cannot be read at the agreed distance and pace.

## 14. Evidence gaps carried forward

- No direct group sessions or usability evidence.
- No disabled-participant evidence.
- No legal clearance or approved content pattern.
- No sensor, distance-readability, or environmental evidence.
- No editorial owner/capacity evidence.
- No implementation or native release-verification evidence.
- No defined participant recruitment or results for people who regularly use screen readers or non-motion controls.

These gaps are explicit constraints on confidence. They are not permission to invent research or declare the experience validated.
