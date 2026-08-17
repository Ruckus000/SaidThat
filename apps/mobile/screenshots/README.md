# Said That? — screenshot brief for Claude Design

Export this whole folder (`README.md` + the 13 PNGs) into Claude Design. This document is the product brief; the images are the current visual baseline to redesign from.

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

- Device: Expo iOS Simulator, **iPhone 16e** (1170 × 2532)
- Captured: 2026-07-30, on the **VOLT** direction
- Status: **local fixture MVP UI** — not release-ready, not production content
- Visual baseline: cool near-black stage (`#0B0E13`), electric lime `#CDF244` as the signal and
  CTA, hot pink `#FF4FA0` as the opposing answer and the miss, Bricolage Grotesque display +
  Inter body. See [`docs/ux-design-direction.md`](../../../docs/ux-design-direction.md).
- **How these were produced:** rendered through a temporary harness that drives each screen
  directly by deep link, rather than by playing through the game. Every pixel is the real
  component with real styles and real fixture content, but the *state* is posed — the score,
  streak, and round numbers are chosen to show each surface at its most informative (e.g. the
  round shot carries a live streak so the lit context pill is visible). The harness is not
  committed.
- Chrome differs by stage: Round, Result, Recap, the Private Relay shutter and Paused
  deliberately have no wordmark row — Round carries its own round/streak pills, Result goes
  full-bleed, Recap opens on the spark MARK, the shutter carries its own `PRIVATE HANDOFF` pill,
  and Paused is the off-ramp. Because no wordmark means no tappable logo to escape by, **Paused
  owns leaving**: it carries an explicit `LEAVE THE ROOM` under `RESUME SAFELY`, and that is the
  only route Home mid-run. Leaving is non-destructive — the run counters survive, so Home still
  reports the abandoned run as `THIS RUN`.

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

Entry surface. Lime **SAID THAT?** wordmark, `ROOM · 0` pill, SVG settings gear, lime/pink eyebrows **REAL QUOTES. / TOTAL LIES.** (matching the answer buttons), the 92pt **SAID / THAT?** hero over a raked background MARK, a rotated lime **REAL OR FAKE** marquee, primary CTA **START A ROOM**, privacy strip, and the amber **LOCAL DEVELOPMENT FIXTURES** banner.

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

Core game screen — no wordmark row. `ROUND 3 / 7` pill on the left and a lit `✦ STREAK ×2` pill on the right (the score when no streak is running; `PRIVATE HANDOFF` under Private Relay). Lime-bordered prompt card with the open-quote MARK, the attributed quote, instruction for group vs holder, two answer actions (**SAID IT** / **TOTAL LIE**), and a safe pause escape.

**Redesign focus:** quotation is the hero; both answers equal affordance until commit; no truth leakage; large tap targets.

---

### `05-result-correct.png` — Result · correct

Post-commit payoff when the room called it right: a full-bleed lime flash with the closing MARK, kicker **THE ROOM CALLED IT**, the spring-stamped **NAILED IT!** verdict, **+100**, a streak pill carrying one drawn spark per streak step, and CTAs **SEE THE TRUTH** / **NEXT PROMPT**.

**Redesign focus:** celebrate *game skill* (reading the room), not “verified reality.” Hit/miss must not rely on green/red alone.

---

### `06-result-incorrect.png` — Result · incorrect

The same shell for a miss, in pink, with the struck MARK, kicker **THE ROOM GOT PLAYED**, and **FOOLED YA.** The reward line points at the truth rather than the player. Hit and miss differ by word, kicker and MARK glyph as well as color, so the outcome never depends on hue.

**Redesign focus:** meaning via words + MARK shape first, so the outcome survives without color; never shame individuals. (VOLT deliberately does *not* keep hit and miss color-symmetric — what the hue encodes is game outcome, never authenticity.)

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

Safe leave / pause from Room Beacon — no wordmark row. Centered selection-dot MARK, lime **SESSION PAUSED**, the reassurance **NOTHING WAS SUBMITTED.**, then **RESUME SAFELY** with **LEAVE THE ROOM** beneath it. The room can resume without corrupting scoring, and leaving keeps the run reportable on Home.

**Redesign focus:** pause ≠ failure; resume and leave are both obvious, and resuming is clearly the primary of the two.

---

### `11-content-unavailable-empty.png` — Content unavailable · empty deck

Non-playable empty state when no cards can be dealt.

**Redesign focus:** honest empty state; no placeholder quotes; path back to safety.

---

### `12-content-unavailable-corrupt.png` — Content unavailable · corrupt deck

Non-playable fault when the deck fails validation / is corrupt.

**Redesign focus:** distinct from empty; technical fault explained in plain language; never invent cards to “keep the party going.”

---

### `13-recap.png` — Run recap

End-of-run scoreboard — no wordmark row. Lime spark MARK, pink **RUN COMPLETE** eyebrow, the rank word in lime, then a stat table (score, called right, accuracy, best streak). Ranks rate game skill, never a person and never a truth verdict, and stay encouraging at the low end.

**Redesign focus:** a scoreboard, not a settings list; a rough run must never read as punishment.

---

## Suggested Claude Design brief (pasteable)

> Redesign **Said That?**, a local-first one-phone party game about real-or-fake quotes. Use the attached 13 screenshots as the full route inventory (home, setup ×2, round, results ×2, reviews ×2, shutter, paused, content unavailable ×2, recap). Keep every non-negotiable in the README: tap-only play, no color-only truth, fixture disclosure, privacy shutter, and no live social/account framing. The shipping direction is **VOLT** — cool near-black stage, one electric lime signal per screen, hot pink as the opposing answer and the miss, quotation-mark MARK identity. One composition per screen; statement/quote is the hero on round; cards only where they hold a real control.

## Icons

Every icon is **drawn as SVG**, never typed as a character. Emoji and dingbats (⚙ ✦ ◆ ○) render
inconsistently across devices and fonts, so `uiState.test.mjs` fails the build if one appears in
a label. Two separate families:

- **THE MARK** (`src/components/markPaths.js`) — the identity glyphs that carry meaning
  (open/close quote, selection dot, spoken, struck, spark). No check glyph, ever.
- **UI icons** (`src/components/uiIconPaths.js`) — plain functional affordances like the settings
  gear. Never used to express game state; the two namespaces are asserted disjoint.

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
├── 12-content-unavailable-corrupt.png
└── 13-recap.png
```
