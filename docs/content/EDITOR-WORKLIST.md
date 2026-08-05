# Editor worklist — `pop-voices`

60 cards, 30 authentic / 30 fabricated, 44 figures. Every gate green.

```bash
node tools/content-pipeline/bin/report.mjs --deck pop-voices
```

```
cards            60 total, 60 shippable
authentic share  50.0%  (30A / 30F)
issues           0 blocking, 89 warnings
leave-one-out accuracy  46.7%  [ok]
```

Leave-one-out below chance means surface style carries no authenticity signal —
a player cannot win on texture, only by reasoning about the figure. The
pool-size, figure-variety and non-post-share warnings from the 14-card version
are all cleared.

---

## The only thing actually blocking progress

**Nobody has played this with a room yet.** Every difficulty in the deck is
`difficultyPrior` — an editorial guess. The rubric's whole position is that
funniness gets measured rather than asserted, and it has not been measured once.

```bash
# Settings → EXPORT PLAYTEST DATA, drop the JSON in content/playtest/, then:
node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices
```

Nothing moves status below **12 exposures across 4 groups**, so expect the first
one or two sessions to report `insufficient-data` throughout. That is the Wilson
discipline working, not the tool stalling — it is what stops three groups who
happen to share a reference from retiring a good card.

Realistically that means **four to six separate rooms** before the first card
earns a verdict.

**Use a release build for real data.** A development build mixes the dev fixtures
into the run, which is why names like "Ember Lane" appear among real figures. The
importer now reports unmatched card ids, so fixture contamination is visible
rather than silent — but it is cleaner to avoid it.

What to watch is the **spread**, not the average: correct-rates clustering near
0.55 with slow answers means the deck is working. Cards at 50% with *fast*
answers mean a room guessing rather than arguing, and correct-rate alone cannot
tell those two apart.

---

## Warnings worth an editor's eye (89 total)

None block. Most are one class of thing.

**60 × `editorial.single-approver`** — every card carries `owner:pre-release`.
The two-person rule is still the release bar (ADR-016). When a second editor
exists, replace the marker card by card rather than leaving it in place.

**10 × `safety.possible-third-party`** — a sentence-initial capitalised word the
detector cannot distinguish from a name. Ordinary prose and a real first name
look identical in that position, so it defers to a human by design. Confirm by
eye and move on.

**7 × `provenance.single-capture`** — one archive capture and no independent
citation. The wording is confirmed once rather than cross-checked. These are the
deep cuts no outlet wrote about, which is exactly why they are good cards; a
second capture at a different date would clear it.

**5 × `read-aloud.front-loaded`**, **2 × `clause-count`**, **1 × `very-short`**,
**1 × `long`** — delivery heuristics. Read each aloud once and decide.

**3 × `safety.title-case-unscanned`** — name detection is skipped on Title Case
text because capitalisation carries no signal there. Check those three by hand.

---

## Material already researched but unused

The sports research lane returned seven verified candidates that never made the
deck — Mike Tyson on pigeons, Andy Murray at the Beijing village, two early Shaq
posts, JaVale McGee on McDonald's Monopoly, Michael Owen on the M6, Gary Lineker
on nosebleed seats. All archive-verified with wording read from the archived page
rather than an article.

They were cut only for balance: sports was already at three cards and the
category cap is 35%. If the deck grows past 60, they are the cheapest next batch
— the verification work is done.

---

## Standing rules when you grow it

- **Keep the halves style-matched.** Length buckets, era, terminal punctuation,
  lowercase openings, and the presence of `!` / ALL-CAPS / ellipses all sit
  within tolerance today. Adding polished fakes and messy reals reintroduces
  exactly the leak the old candidate file had. Re-run `report.mjs` after every
  batch and watch the leave-one-out number.
- **Never take wording from an article.** Outlets silently tidy typos, hashtags
  and line breaks — confirmed on a BuzzFeed transcription that dropped all three.
  Wording comes from the archive capture (rubric §1.3.1).
- **Never invent an archive timestamp.** Confirm every one against
  `https://archive.org/wayback/available?url=…`, or use
  `bin/verify-candidates.mjs`, which re-checks a candidate file for you. Run it
  alone; the API rate-limits under concurrent load.
- **Pair some figures, not all.** A figure with both a real and a fake card lets
  the decoy be texture-matched against that person's own voice. Pairing *every*
  figure would let a repeat player who remembers one card infer the other.
