# UX/UI Audit — Summary

**Scope:** `apps/mobile` (the local-first fixture MVP)
**Date:** 2026-07-22
**Shipped as:** PRs #21–#25, all merged to `main`

---

## The core finding

The app was **clinically neutral to the point of having no emotional pulse** — it
read like a privacy policy, not a party game. The root cause was a single category
error: it conflated **truth-neutrality** (correct, and legally load-bearing for a
game about public figures and misinformation) with **emotional-neutrality** (which
killed the fun).

Every change flowed from **separating those two layers**:

| Truth layer — stays neutral (non-negotiable) | Game layer — should be alive |
|---|---|
| The authentic / fabricated label | Anticipation before the reveal |
| The explanation and source caveats | Reward for a good read (score, streak) |
| No color-coded verdict, no "gotcha" | Warm voice, momentum, a crescendo |

The app had applied truth-layer neutrality to the game layer too, so it had no pulse.
The fix was to make the *game of guessing* energetic and rewarding while keeping the
*truth claim* scrupulously neutral.

---

## What shipped

| PR | Theme | Highlights |
|----|-------|-----------|
| **#21** | Make it fun | Post-commit **reveal beat** ("Locking it in…"), **streak + score** rewards, **equal-weight answer buttons** (the old lime-primary/outline pairing was biasing guesses), reveal payoff on Review, press feedback, corrected toggle a11y roles, 56dp tap targets, warmer game-layer copy |
| **#22** | Review follow-ups | Stopped the reveal pulse loop on reveal, tested `PLAY_AGAIN` fail-closed, "LAST RUN" vs "THIS RUN" on Home |
| **#23** | Setup density | New **`ToggleRow`** affordance (toggles look like toggles), `radiogroup` grouping, tighter copy |
| **#24** | Feedback channel | Optional **haptics** (`expo-haptics`): a firm tick on commit, a light tick on reveal — truth-neutral, opt-out, tap-only unaffected |
| **#25** | Consistency | Made `ToggleRow` the **single canonical toggle**; `Choice` is radio-only again |

---

## Before → after

- **Home:** opened with a "…not a social feed" disclaimer → opens with the hook
  **"Did they really say that?"**
- **A round:** tap → *instant* verdict in tiny 12px lime, with wrong answers styled
  identically to right → now: card fades in → commit (haptic) → **anticipation beat**
  → verdict springs in with a non-color mark, a popping score, and a streak.
- **The loop:** an infinite deck cycle with no ending → a **bounded run → recap
  scoreboard with a playful room rank → one-tap reshuffled rematch.**
- **Setup:** five identical bordered cards + two verbose paragraphs → grouped
  sections, a real on/off toggle, a one-line reassurance.
- **Answer fairness:** one answer was the visual "default" → **both answers carry
  equal weight.**

---

## Guardrails held throughout

- Truth verdicts stay **neutral, text-first, non-color-coded**; the recap and haptics
  celebrate **game skill only**, never a person or a verdict, and **never punish a
  miss**.
- **Tap-only play is always complete**; every animation and haptic has a
  **reduced-motion / opt-out equivalent**.
- Exactly-one-commit, holder privacy, and Private Relay shutter recovery preserved —
  the privacy invariant (no card exposed off `ROUND` / `REVIEW`) held automatically
  for the new `RECAP` stage.
- Local-first, fixture-only, no accounts / backend / live data. One dependency added
  (`expo-haptics`, already the documented stack).

---

## Verification

Every PR passed the full gate suite on each change:

- `npm --prefix apps/mobile run typecheck` — clean
- `npm --prefix apps/mobile test` — green (grew from 36 to 39 deterministic tests)
- `npx expo export --platform ios` — succeeds (including with the new dependency)
- `node tools/designops/enforce.mjs --intent implementation --working-tree` — ALLOWED

---

## Deferred to native verification

As the demo spec already scopes sensor/native behavior to release verification, the
following remain on-device tasks (not covered by the JS-level gates above):

- Actual **haptic firing** on device.
- **VoiceOver / TalkBack** behavior of the new `switch` and `radiogroup` semantics.
- **Dynamic-type** layout at large font sizes.
- The **reveal-beat timing** feel on real hardware.

## Open cosmetic judgment calls (non-blocking)

- The 🔥 streak-badge emoji (paired with the word "STREAK") — trivially made
  text-only if a DesignOps reviewer prefers.
- Product mode names ("Room Beacon", "Private Relay", "holder") were left as-is —
  they're product identity wired into tested labels and the demo spec; renaming is a
  product decision.
