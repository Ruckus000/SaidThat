# Editor worklist — getting `pop-voices` shippable

The pipeline is built and enforcing. The deck is not shippable yet, and this is
the list of what a human has to do about it.

Regenerate this picture at any time:

```bash
node tools/content-pipeline/bin/report.mjs --deck pop-voices
```

Current state: **40 cards, 0 shippable, 72 blocking issues, 42 warnings.**

---

## Why this cannot be finished by tooling

Two of the blockers are deliberately human, and automating them would defeat
their purpose:

- **Provenance (60 of the 72 blockers).** 20 authentic cards sit at Tier C —
  16 of them cite the same listicle. Tier A/B needs a primary record (archive
  capture of the original post, or a transcript/book/broadcast) plus an
  independent contemporaneous citation. Generating those citations is exactly
  the laundering that the tier system exists to catch, so the gate has to stay
  unsatisfiable until someone does the research.
- **Two-person approval.** Every card naming a real figure needs two distinct
  named approvers. Inventing names would turn the rule into theater.

---

## 1. Provenance — 20 authentic cards

Per card: either re-source to Tier A/B, or cut it.

- Capture the original status URL on `web.archive.org` or `archive.today` →
  that is the primary record. Set `source.verificationMethod: "web-archive"`,
  `source.retained: true`, `sourceTier: "A"`.
- Add one independent secondary: an article dated within ~30 days of the post
  quoting the exact wording. Mark `citations[].independent: true`.
- Two citations count as **one** if the wording is character-identical and the
  later links the earlier, or both trace to the same syndicator.
- `b1…0003` (Ryan Reynolds, Wayback capture) is the only Tier-A card in the
  file today. Every other authentic card should end up looking like it.

**Target ≥25% of the authentic pool from the non-post lane** — transcripts,
books, official podcasts, broadcast transcripts. It is the most defensible
provenance available, it unlocks figures who never tweeted, and spoken quotes
widen the authentic style distribution, which makes decoy texture-matching
measurably easier.

## 2. Safety — 2 cards, cut or rewrite

- **Gordon Ramsay** (`b1…0110`) — sexual innuendo attributed to a named living
  person, and it ships `sensitivity: "teen"` inside an `everyone` deck. That is
  a live schema violation, not a judgement call. Reject.
- **Taylor Swift** (`b1…0112`) — fabricated claim about real identifiable third
  parties, on the topic with the highest screenshot-travel risk in the file.
  Reject; a rewrite is worked through in `editorial-rubric.md` §3.5 Example 4.

Five more cards trip `safety.third-party-named` (`Deadpool`, `Wi-Fi`,
`Home Alone`, `Fleetwood Cher Mac`, `Fenty`). None is a person, so these are
D6-anchor-4 brand mentions needing second-editor sign-off rather than rejection.

## 3. Read-aloud — 5 cards

- `#oscars` on the Ellen card — strip and log the normalization. The card still
  fails on image-dependence and universal recall, so it is probably a cut.
- Two `@handle` cards (Dionne Warwick) — strip and log.
- The ~250-char Tony Hawk age-arc card — over the 180 limit, a formatted list,
  punchline is a self-callback. Unplayable aloud; cut.
- `twttr` — genuinely hard to say. Cut or accept as a deliberate exception.

## 4. The highest-leverage fix — break every same-figure pair

Do this one before anything else. Nearly every fabricated card is a same-figure
companion riffing the same joke: meatball→spaghetti, pickle→ketchup,
"Wu Tang Cher Clan"→"Fleetwood Cher Mac", "wanna feel old"→"wanna feel ancient".

Re-attribute half the decoys to figures with **no** authentic card in the deck,
and re-format the other half so no two cards share a `formatFingerprint`.

That single pass fixes the fingerprint collisions, the five fabricated-only
figures, and much of the style mismatch — and it converts the file from "a room
solves this in one session" to "a room has to actually play".

## 5. Decoy rewrites

Apply `editorial-rubric.md` §3. The governing move: **write the funny version,
then damage it.** Spend 2–4 points of Laugh to buy 2 points of Surprise; under
the weights that trade is always correct.

At least 11 of the 20 current decoys match the stand-up shape (two sentences,
second shorter, ends in a period, funniest content in the last five words). That
shape is a forensic marker a room reads by round four without being able to name
it.

Also: **all 20 fabricated cards share one 11-word explanation.** The reveal is
the payoff screen. Each one should say what specifically was invented and why it
was believable.

## 6. Voice Banks — 22 empty

`tools/content-pipeline/content/figures.json`. Five to ten surface habits per
figure: casing, terminal-punctuation rate, typical length, typo rate, recurring
subjects, favored constructions, era of peak activity.

This is not documentation overhead — it is the input to decoy texture-matching.
A decoy written without it is written against an imagined celebrity and reads
that way.

## 7. Scale and balance

- **≥60 cards, ≥20 distinct figures.** Below that the run-builder produces
  near-identical runs.
- Authentic share 45–55%; ≥5 categories with none above 35% (`music` is
  currently 47.5% and blocks).
- Every `difficultyPrior` level present, none above 40%.
- **Cross-texture ballast:** ≥3 authentic cards flagged `readsFabricated` and ≥3
  fabricated flagged `readsAuthentic`. This is the property that actively breaks
  meta-learning rather than merely not creating it — the room must be punished
  for pattern-matching on polish at least once per session.

## 8. Approvals, then ship

Two distinct approvers per card; set `status: "provisional"`.

---

## Definition of done

```bash
node tools/content-pipeline/bin/validate.mjs --deck pop-voices   # exits 0
node tools/content-pipeline/bin/report.mjs   --deck pop-voices   # LOO ≤ 0.58, no class markers
node tools/content-pipeline/bin/build.mjs    --deck pop-voices   # emits real cards
```

Then three follow-ups in the same PR:

1. Flip the golden in `tools/content-pipeline/test/corpus.test.mjs` from
   "fails exactly like this" to "passes". Do not delete it.
2. Same for the leak assertion in `test/tells.test.mjs` — it currently pins the
   leak as present; it should pin it as gone.
3. Swap the CI step in `.github/workflows/mobile-tests.yml` from the corpus
   golden to a live `validate.mjs` run, per the comment already there.

## After the first real playtest

```bash
# Settings → EXPORT PLAYTEST DATA, drop the JSON in content/playtest/, then:
node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices
```

The pass condition is not "it works". It is a correct-rate distribution centred
near 0.55 with high deliberation. A card at 50% with *low* answer latency is a
room guessing, not a room arguing — and correct-rate alone cannot tell those
apart.
