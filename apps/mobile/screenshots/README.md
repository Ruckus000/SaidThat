# Said That? — screenshot brief for Claude Design

Export this whole folder (`README.md` + the 12 PNGs) into Claude Design. This document is the product brief; the images are the current visual baseline to redesign from.

## What this app is

**Said That?** (repo: *Did They Tweet That?*) is a **one-phone, pass-and-play party game**. Players see a quoted statement attributed to a fictional voice and decide: did they actually say it, or was it made for the game?

It is **not** a social feed, news product, or fact-checker for real public figures.

| Trait | Detail |
| --- | --- |
| Platform | Expo / React Native (iOS Simulator captures below) |
| Connectivity | Local-first; playable offline |
| Accounts | None |
| Live social / telemetry | None |
| Content in these shots | Bundled **development fixtures** only — visibly labeled, not editorial |

Two play modes:

1. **Room Beacon** — phone faces the room (forehead / shared screen). Group discusses; holder taps one answer. Optional tilt sensor is additive; **tap-only must always work**.
2. **Private Relay** — phone is handed person-to-person. Score is concealed during handoff; backgrounding shows a privacy shutter and starts a fresh turn.

## Capture notes

- Device: Expo iOS Simulator, **iPhone 16e**
- Captured: ~2026-07-20
- Status: **local fixture MVP UI** — not release-ready, not production content
- Visual baseline in these PNGs: dark graphite canvas, lime accents, Inter-style UI type
- **Important:** the repo later landed a **HOT MIC** direction (warm aubergine stage, marigold signal, custom quotation MARK). Treat these screenshots as the **interaction/route inventory** and the UI to improve—not as a hard freeze on graphite/lime if you align with HOT MIC. Preserve the behaviors and labels below either way.

## Non-negotiables (do not redesign away)

These are product/safety requirements, not polish:

- **Truth is never color-only.** Correctness and authenticity need plain words plus a non-color shape/mark at equal weight.
- **Pre-answer uncertainty stays separate from post-answer truth.** Round screens must not leak whether the quote is real.
- **Exactly one answer commit** per round (no double-tap scoring).
- **Tap-only equivalence** for motion, haptics, and sensors.
- **Fixture disclosure** stays visible where play starts (local development fixtures · not editorial content).
- **No account, live feed, or telemetry** promises in marketing chrome.
- **Private Relay shutter** must recover safely after background interruption (discard protected prior state).
- **Content unavailable** states for empty / corrupt / withheld decks — clear, non-playable, no fake cards.
- Room Beacon holder assistive tech must not spoiler the active statement to the holder when the phone is on a forehead.
- Do not invent real public-figure names or authentic-looking social posts in mockups.

## Primary user journey

```
Home → Setup (mode) → Round → Result → optional Truth review → next round
                 ↘ Private shutter / Paused / Content unavailable (recovery)
```

## Screenshot catalog

Use filenames as stable IDs when referencing shots in the redesign.

### `01-home.png` — Home

Entry surface. Brand **SAID THAT?**, room score, settings affordance, hero pitch (“Read the room. Trust the reveal.”), primary CTA **Start a room**, privacy strip (no account / no live feed / no telemetry), and amber **LOCAL DEVELOPMENT FIXTURES** banner.

**Redesign focus:** brand-first first viewport; keep fixture honesty and privacy claims legible; one clear CTA.

---

### `02-setup-room-beacon.png` — Setup · Room Beacon

Mode picker with **Room Beacon** selected. Explains shared-phone / forehead play and access role (holder vs screen-facing) where relevant.

**Redesign focus:** mode choice must be obvious without color alone; Room Beacon instructions stay scannable in a dim room.

---

### `03-setup-private-relay.png` — Setup · Private Relay

Same setup shell with **Private Relay** selected. Emphasizes private handoff and score concealment during pass.

**Redesign focus:** differentiate modes by structure and copy, not a single accent swap; handoff expectations must be clear before play starts.

---

### `04-round.png` — Round (active prompt)

Core game screen. Mode + round label, banner that this is a **game prompt** (reveal decides truth), large attributed quote, instruction for group vs holder, two answer actions (**They did** / **Made for game**), and safe pause escape.

**Redesign focus:** quotation is the hero; both answers equal affordance until commit; no truth leakage; large tap targets.

---

### `05-result-correct.png` — Result · correct

Post-commit payoff when the room called it right. Outcome label, score delta to the room, CTAs **See the truth** vs **Continue without review**.

**Redesign focus:** celebrate *game skill* (reading the room), not “verified reality.” Hit/miss must not rely on green/red alone.

---

### `06-result-incorrect.png` — Result · incorrect

Same result shell for a miss. Softer / corrective tone; still offers truth review or continue.

**Redesign focus:** color-symmetric with correct where possible; meaning via words + shape; never shame individuals.

---

### `07-review-fabricated.png` — Review · fabricated

Truth disclosure after a **made-for-game** fixture. Explicit fabricated / game-made labeling, source limitations, path to continue or queue a minimal local report.

**Redesign focus:** truth label is textual and unmistakable; report UI stays category-only (no free-text statement dump).

---

### `08-review-fixture-authentic.png` — Review · simulated authentic fixture

Truth disclosure for a **simulated-authentic** fixture used only to exercise the mechanic. Still development content — must not read as a real public claim.

**Redesign focus:** visually parallel to fabricated review; authenticity state named in words; no “verified checkmark” brand language that implies platform endorsement of real-world truth.

---

### `09-private-shutter.png` — Private Relay shutter

Privacy interruption surface after backgrounding / unsafe handoff. Blocks prior protected content; prompts a clean resume.

**Redesign focus:** calm, opaque, irreversible-feeling protection; one clear recovery action; no peek at the previous quote.

---

### `10-paused.png` — Room Beacon paused

Safe leave / pause from Room Beacon. Room can resume without corrupting scoring.

**Redesign focus:** pause ≠ failure; resume and leave home are both obvious.

---

### `11-content-unavailable-empty.png` — Content unavailable · empty deck

Non-playable empty state when no cards can be dealt.

**Redesign focus:** honest empty state; no placeholder quotes; path back to safety.

---

### `12-content-unavailable-corrupt.png` — Content unavailable · corrupt deck

Non-playable fault when the deck fails validation / is corrupt.

**Redesign focus:** distinct from empty; technical fault explained in plain language; never invent cards to “keep the party going.”

---

## Suggested Claude Design brief (pasteable)

> Redesign **Said That?**, a local-first one-phone party game about real-or-fake quotes. Use the attached 12 screenshots as the full route inventory (home, setup ×2, round, results ×2, reviews ×2, shutter, paused, content unavailable ×2). Keep every non-negotiable in the README: tap-only play, no color-only truth, fixture disclosure, privacy shutter, and no live social/account framing. Prefer a warm, stage-like night-out feel (HOT MIC: aubergine + single marigold signal + quotation-mark identity) over generic dark dashboards. One composition per screen; statement/quote is the hero on round; cards only where they hold a real control.

## File checklist for export

```
apps/mobile/screenshots/
├── README.md                          ← this brief
├── 01-home.png
├── 02-setup-room-beacon.png
├── 03-setup-private-relay.png
├── 04-round.png
├── 05-result-correct.png
├── 06-result-incorrect.png
├── 07-review-fabricated.png
├── 08-review-fixture-authentic.png
├── 09-private-shutter.png
├── 10-paused.png
├── 11-content-unavailable-empty.png
└── 12-content-unavailable-corrupt.png
```
