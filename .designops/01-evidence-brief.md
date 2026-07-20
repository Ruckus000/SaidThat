# Evidence Brief

**Status:** Draft  
**Date:** 2026-07-18  
**Phase:** Strategy  
**Evidence basis:** Repository planning documents plus an early Expo/React Native scaffold; no interviews, usability sessions, production analytics, legal opinion, or current production evidence was supplied.

## 1. Project context

- **Mode:** Proposal
- **Origin:** Existing repository containing planning documents and a partial, gated Expo/React Native mobile scaffold under `apps/mobile`
- **Detector result:** `family: unknown`, `styling: unknown` for LaunchPad's qualified browser lanes. The repository includes `apps/mobile/package.json`, but no Next.js, Vite, WordPress, Laravel, Tailwind, or Composer lane is detected.
- **Implementation status:** The Expo/React Native TypeScript scaffold is present but must not be expanded until the signed implementation gate permits it; a later Next.js admin remains deferred.
- **Styling lane:** Undecided and not implemented
- **Accessibility target:** WCAG 2.2 AA plus native iOS/Android accessibility behavior
- **Verification mode for the current proposal:** Artifact-only

The LaunchPad 0.2 browser lane matrix qualifies Next.js/Tailwind, Vite/React, WordPress, and Laravel for their bounded fixtures. Expo/React Native is outside that matrix. The scaffold therefore does not qualify a browser verification lane, and any later release claim will need project-owned native verification.

## 2. Evidence available

### Product and task evidence

The product brief, master plan, gameplay spec, roadmap, backlog, and ADRs consistently define a local one-phone party game with a binary authenticity judgment. They identify the intended launch audience as 18–28 friend groups, the primary format as forehead play, pass-and-play as a secondary accessible format, and rematch as the core validation behavior.

This is stakeholder-authored product intent, not observed user evidence. No direct participants have confirmed the audience, jobs, contexts, comprehension, or fun.

### Content and trust evidence

The content, legal, security, gameplay, and data documents consistently require editorial content, no client-side X dependency, harmless human-written fabrications, explicit post-answer labeling, source records where allowed, reporting, tombstones, and rapid removal. The repository also records unresolved counsel questions on trademark, publicity, defamation, copyright, storage, and store policy.

The operational doctrine is strong enough to constrain design exploration. It is not legal clearance and does not prove that users will correctly interpret fabricated content.

### Accessibility and context evidence

The UX, gameplay, testing, architecture, and backlog documents call for tap-only and no-motion paths, screen-reader completion, color-independent feedback, reduced motion, large targets, pause, device testing, foreground/background handling, and motion fixtures.

These are explicit requirements. No disabled-user research, accessibility audit, readability study, or physical-device results exist yet.

### Technical and performance evidence

The repository defines offline-first play, no account for Phase 0, bundled content, later manifest/tombstone sync, a motion state machine with neutral return, and targets for startup, first playability, frame rate, sensor processing, package size, memory, and crash-free sessions.

The partial scaffold is not evidence that these targets work. All experience, sensor, accessibility, offline, lifecycle, and performance targets remain unverified constraints.

### Market evidence

The market research cites adjacent real/fake quizzes and established party formats and records the absence of proprietary market data or direct research for this product. Those sources support hypotheses about mechanic familiarity and category precedent; they do not prove whitespace, demand, retention, or audience fit.

## 3. Primary audiences and experience roles

### Intended primary audience

- Friend groups and party-game players, with 18–28 college/young-adult groups proposed as the launch audience
- Pop-culture fans as a secondary segment

### Required experience roles

- Session starter
- Forehead phone holder
- Screen-facing group members
- Pass-and-play player or team member
- Tap-only or screen-reader player
- Card reviewer/reporter
- Editorial operator as a secondary operational user

These roles are derived from the planned mechanics, not from invented personas.

## 4. Highest-value tasks

1. Start a playable round with one phone and minimal explanation.
2. Understand the current role and control method before the timer starts.
3. Read and judge each attributed statement quickly and unambiguously.
4. Register one intended answer without duplicate or accidental input.
5. Recover from sensor, connectivity, orientation, or interruption problems without losing the round.
6. Understand the authentic/fabricated status after the guess and inspect allowed evidence.
7. Continue the social session by rematching or handing the phone to the correct next player.
8. Report questionable content and return to the same review context.

## 5. Requirements sources reviewed

All current repository planning documents were reviewed and are registered with exact path and SHA-256 in `03-requirements-map.json`:

- master plan and README;
- product brief and market research;
- gameplay and UX specifications;
- legal/platform, content, security, and moderation documents;
- architecture, data model, and decision log;
- analytics, roadmap, backlog, and testing strategy;
- risk register and open questions.

## 6. Evidence gaps

| Gap | Risk | Design implication |
|---|---|---|
| No direct user or group observation | High | Audience, comprehension, social energy, and rematch are hypotheses |
| No real-card playtest evidence | High | Pacing, readability, content quality, and attribution difficulty are unknown |
| No sensor/device evidence | High | Forehead mode cannot be treated as reliable or preferred yet |
| No accessibility participant evidence | High | Equivalent play paths need explicit validation, not checklist compliance alone |
| No legal opinion or brand clearance | Critical for launch | Visual/copy framing cannot be represented as legally safe or store-ready |
| No validated source-rights pattern | Critical for launch | Authentic-card design and offline/source behavior remain provisional |
| No editorial owner or capacity evidence | High | Deck freshness, report handling, and preview workflow are operational risks |
| No launch market, locale, age-rating, or consent decision | Medium–high | Copy, content filters, settings, and analytics disclosure cannot be finalized |
| No implementation or native test harness | High for release | Expo lane requires project-owned native verification |

Formal research absence does not block strategy drafting. It does block treating the high-risk interaction and trust hypotheses as validated and triggers explicit review before direction work.

## 7. Key risks for UX/UI

1. **Fast but not trustworthy:** a high-energy treatment could make fabricated claims screenshot-travel as real.
2. **Readable but not social:** a screen may pass static contrast checks yet fail at distance, angle, motion, noise, or group pace.
3. **Differentiated but unreliable:** forehead tilt may define the product in planning but fail across bodies, grips, cases, and devices.
4. **Accessible only by escape hatch:** tap or screen-reader paths may technically exist without preserving timing, scoring, comprehension, and fun.
5. **Setup turns into configuration:** mode, deck, player, timer, control, sensitivity, and consent choices could delay first play.
6. **Truth arrives too late or weakly:** users may remember the attribution but miss the fabricated label.
7. **Content states are underdesigned:** corrupt, unavailable, disputed, removed, queued-report, and offline states are not yet formally specified.
8. **Current visual tokens create false certainty:** the palette, typography examples, gradient, radius, and stylistic avoid-list in `docs/ux-spec.md` lack traceable user or task evidence.

## 8. Explicit assumptions

- The forehead authenticity loop is socially fun and meaningfully different from pass-and-play trivia.
- Groups can understand the game and reach a valid answer with little or no facilitation.
- The screen-facing group can read representative statements from several feet away in party contexts.
- Users will understand the difference between pre-answer game ambiguity and post-answer editorial truth.
- Tap-only and screen-reader paths can preserve the game's core social value.
- Editorial operations can supply safe, funny, sourceable cards at the required cadence.
- Pre-reveal game context can remain capture-safe without leaking the answer.
- The proposed launch segment can meet the registered Phase 0 completion and rematch bar.

Each high-risk core assumption is registered with a falsifiable hypothesis and kill criteria in `03-requirements-map.json`.

## 9. Anti-slop checkpoint

No font, color, layout, component, surface treatment, motion style, illustration, or brand motif is approved in this brief. The existing visual direction is preserved as repository evidence but explicitly downgraded to a solution hypothesis until three territories are compared against the same tasks, content, accessibility needs, and trust criteria.

No personas, interviews, metrics, testimonials, legal clearances, or research findings have been invented. Proposed numeric thresholds are labeled as stakeholder-defined criteria, not achieved outcomes.
