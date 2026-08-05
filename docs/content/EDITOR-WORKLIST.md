# Editor worklist — `pop-voices`

The deck ships. 14 cards, 7 authentic / 7 fabricated, every gate green.

```bash
node tools/content-pipeline/bin/report.mjs --deck pop-voices
```

```
cards            14 total, 14 shippable
authentic share  50.0%  (7A / 7F)
issues           0 blocking, 23 warnings
leave-one-out accuracy  28.6%  [ok]
```

Leave-one-out below chance means surface style carries no authenticity signal:
a player cannot tell real from fake by texture, only by reasoning about the
figure. That is the property the deck exists to have.

---

## What replaced the candidate file

The 40 ported candidates could not ship, and most could not be fixed:

- **16 of 20 authentic cards cited one listicle.** Tier C. None ship.
- **One did not verify at all.** A Chris Evans line about USB cables returned no
  evidence of existing. It scored well on every editorial dimension and is very
  likely a listicle fabrication — which is the argument for the tier system in a
  single card.
- **Two failed safety** (the Ramsay innuendo, which also violated the deck's own
  sensitivity ceiling; and a Taylor Swift card making fabricated claims about
  identifiable third parties).
- **Several were dead rounds by the rubric's own scoring** — the Oscars selfie,
  "just setting up my twttr", the Tony Hawk TSA bit: recall, not reasoning.
- **All 20 fabricated cards shared one explanation**, so half the deck's payoff
  moments were the same eleven words.

`bin/seed-pop-voices.mjs` rebuilds the deck from records that verify. Six of the
seven authentic cards carry a Wayback capture confirmed present through the
availability API, plus an independent contemporaneous article. The seventh
(Macaulay Culkin) ships Tier B on two independent outlets and explicitly claims
no archive.

Every fabricated card is attributed to a figure with **no** authentic card in the
deck. That is the fix for the pairing defect — the old file paired nearly every
fake with a real card by the same person, so the room learned "the second one is
the fake" and stopped arguing.

---

## Remaining work

### 1. Grow the pool — the one real gap

`composition.pool-size` warns: 14 cards against a floor of ~60, and 14 figures
against ~20. At this size the run-builder has little room, so runs will repeat
sooner than they should. A 14-card deck yields one full 10-card run with only
four cards held back.

Each new authentic card needs the same treatment: resolve the status URL,
confirm a capture through
`https://archive.org/wayback/available?url=twitter.com/<user>/status/<id>`, and
find an independent contemporaneous article quoting the exact wording. Budget
roughly three lookups per card, and expect some to fail verification outright.

Each new fabricated card needs a figure not already in the deck, a fingerprint
not already used, and a distinct explanation.

**Keep the halves matched while you grow.** The current parity is deliberate:
length buckets, era tags, terminal punctuation, lowercase openings, and the
presence of exclamation marks, ALL-CAPS bursts and ellipses all sit within
tolerance across the two classes. Adding six polished fakes and six messy reals
would reintroduce exactly the leak the old file had. Re-run `report.mjs` after
every batch and watch the leave-one-out number.

### 2. Replace the owner approvals

All 14 cards carry `owner:pre-release`, and the validator warns on each one. The
two-person rule is still the release bar (ADR-016). When a second editor exists,
replace the marker card by card rather than leaving it in place.

### 3. Clear the soft warnings

- Three `safety.possible-third-party` hits — sentence-initial capitalised words
  the detector cannot distinguish from names. Confirm by eye.
- One `safety.title-case-unscanned` — the Jaden Smith aphorism. Name detection is
  skipped on Title Case text, so check it manually.
- One `read-aloud.clause-count` — the Kim Kardashian card is five sentences.
  It survives because the beat is distributed rather than terminal, but it is
  the longest thing in the deck to read aloud.

### 4. Calibrate

The deck has never been played. Every difficulty is still `difficultyPrior` — an
editorial guess, not a measurement.

```bash
# Settings → EXPORT PLAYTEST DATA, drop the JSON in content/playtest/, then:
node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices
```

The pass condition is a correct-rate distribution centred near 0.55 with high
deliberation. A card at 50% with *low* answer latency is a room guessing, not a
room arguing, and correct-rate alone cannot tell those apart.

Expect the Macaulay Culkin card to come back too easy — it is deliberately the
slot-1 warm-up. If "is meatball an fruit" lands near 50% with a high laugh share,
that is the deck working.
