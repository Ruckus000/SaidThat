# Room Beacon — frozen low-fidelity prototype

**Candidate ID:** `room-beacon`
**Role:** selected
**Purpose:** Test whether a group-visible, forehead-first shared board earns its added motion and orientation complexity while retaining an equivalent blind tap path.

This is a behavior-and-content prototype specification, not production UI or an approved visual system. Every content item, role script, state, access path, device condition, and capture condition is bound to `shared-content.json`.

## Interaction model

1. **Role rehearsal.** The session starter sees a short, role-specific explanation: the screen-facing group can read and discuss; the forehead holder cannot perceive the active statement and makes one group commit; the score belongs to the group.
2. **Readiness.** The holder chooses `Tilt` or `Tap`. Readiness names the active control and offers `Use tap instead` before countdown. The answer path remains blind in either mode.
3. **Active pre-reveal.** A persistent content-neutral game-round marker surrounds a single shared statement. The screen-facing group can read statement, attribution, time status, and the holder's readiness. No authenticity, source status, or authority cue appears.
4. **Commit and recovery.** Tilt or a holder-controlled tap records exactly one group answer. Sensor loss, duplicate-motion risk, backgrounding, and orientation change preserve the round and offer a labeled tap retry without exposing the card to the holder.
5. **Result and review.** The round result names the group outcome. A distinct review panel begins with the truth classification in words, then explanation, permitted source status, report, and a retained-session next action.
6. **Handoff and rematch.** Pass-and-play uses a protected shutter before any private next-player prompt. Rematch returns to readiness without changing role, answer, score, or truth semantics.

## Frozen scenarios

### RB-01 — unaided first answer

Start a forehead session with the fixture's median-length playable card. The group must reach one valid answer after the prepared prompt, without moderator clarification. Observe role comprehension, readiness comprehension, assistance, restart, and time to first valid answer.

### RB-02 — group readability and control recovery

Run short, median, and maximum-length playable cards under each frozen device, distance, angle, and lighting condition. During one round, introduce the fixture's sensor-failure state. The group must continue through the labeled tap path with no duplicate commit or holder disclosure.

### RB-03 — truth, capture, and operational-state comprehension

Show each completed review state and the fixture's ordinary screenshot, recording still, photograph, and quote-and-attribution crop. The participant explains the card's status and the meaning of the game marker. Then walk disputed, source-unavailable, removed, queued-report, offline, interruption, and protected-handoff states.

### RB-04 — equivalent access

Run the fixture's tap-only, no-motion, extended-timer/untimed, reduced-motion, no-audio, no-haptic, VoiceOver screen-facing contributor, VoiceOver private pass-and-play, and TalkBack private pass-and-play paths. The paths must retain role-appropriate completion, score, truth review, report return, and privacy semantics.

## Non-negotiable observations

- The holder never receives the active forehead statement through visible UI, speech, audio route, haptic, interruption, or handoff.
- A reasonable pre-reveal capture retains game context but does not leak authenticity, source status, or editorial confidence.
- A maximum-length card may not hide attribution, a critical control, or required game context.
- A sensor problem never silently changes the answer or forces a restart when a tap fallback is available.
- Fabricated-for-game, authentic, disputed, source-unavailable, and removed states are explained in words and never by color alone.

## Comparison constraint

Use the same fixture content, timer, answer labels, score semantics, scenario order, moderator prompt, and post-task questions as the Private Relay countermodel. Only the interaction model and structural expression may differ.
