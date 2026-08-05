# Content pipeline

Build-time tooling that turns editorial card records into a validated deck.
Zero dependencies, plain Node ESM, `node --test`. Nothing here reaches the Expo
bundle — the pipeline *emits* into `apps/mobile/src/content/`, it is never
imported by it.

The normative spec for *what makes a card good* is
[`docs/content/editorial-rubric.md`](../../docs/content/editorial-rubric.md).
This directory mechanically enforces the parts of it that a machine can check.

## Commands

```bash
node tools/content-pipeline/bin/validate.mjs --deck pop-voices
```

```bash
node tools/content-pipeline/bin/report.mjs --deck pop-voices
```

```bash
node --test tools/content-pipeline/test/
```

`validate.mjs` exits non-zero on any blocking issue and is the CI gate.
`report.mjs` never fails — it is what you run *while* rewriting, and it names
which style feature is leaking rather than just refusing the deck.

## Layout

| Path | Role |
|---|---|
| `content/figures.json` | figure identity, `likenessAllowed`, and the **Voice Bank** — the surface habits a decoy for that figure must match |
| `content/decks/<slug>.deck.json` | deck manifest and tombstones |
| `content/cards/<slug>/<cardId>.json` | one card per file, so a PR diff shows exactly which card changed |
| `lib/schema.mjs` | structural validation and the provenance tiers |
| `lib/readability.mjs` | read-aloud fitness (D3) |
| `lib/safety.mjs` | banned-category lexicon and third-party naming |
| `lib/tells.mjs` | deck-level surface-tell detection |
| `lib/composition.mjs` | properties P1–P10 and pool requirements |
| `lib/rng.mjs` | seeded PRNG shared with the app's run-builder |

## Why hand-rolled validation

There is no root `package.json`, so adding Zod means introducing a workspace and
a lockfile. `apps/mobile/src/content/validateDeck.js` already validates in this
idiom, and the editor report needs issue lists keyed by rule code rather than a
parse-error tree. The Zod block in `docs/content/deck-schema.md` remains the
human-readable statement of the shape; `lib/schema.mjs` is what enforces it.

## The tell detector, and why it is deck-level

A single unusual card is fine. A *pattern* is the leak. A room cannot articulate
"fabricated cards end in a period 95% of the time" — they just start voting FAKE
on anything that sounds composed, by round four, and they are right. Two checks:

**Per-feature separation.** Standardized mean difference plus a seeded
permutation p-value. Separately, an **exclusive class marker** — a feature
present in three or more cards of one class and *none* of the other — always
blocks, regardless of effect size. That case is a rule which never misfires for
whoever notices it, and effect size alone under-weights it.

**Leave-one-out Gaussian naive Bayes** over the whole feature vector, catching
leakage spread across features that no single one would reveal. Blocks above
0.62, warns above 0.58.

Both are deterministic: same input, same seed, same verdict. A permutation test
that returned a different p-value per run could not gate CI.

## The calibration loop

Card quality stops being an assertion here. A card ships `provisional`, rooms
play it, and the data decides what happens next.

```bash
node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices
```

1. Rooms play. The app records per-card counts locally — answered, correct,
   skips, laughs, groups. No network, no identity, no timestamps.
2. Someone exports from Settings and drops the JSON into `content/playtest/`.
3. `import-playtest.mjs` merges every export and prints the status changes the
   evidence justifies.
4. An editor applies them by editing the card records, in a reviewed PR.

The tool proposes and never writes. A number is evidence; a decision is
somebody's responsibility.

**Verdicts use Wilson score intervals, never raw proportions.** That is the
whole defence against retiring a good card on a small sample: three groups who
happen to follow the same figure can make a five-star card look broken. Nothing
changes below 12 exposures across 4 groups, and nothing is retired below 40
across 12 — except a harm or misattribution report, which retires at n=1 and
does not argue with statistics.

What the loop is looking for is a correct-rate near 0.5 with a high laugh share.
A card everyone gets right is a dead round however funny it reads; a card
nobody gets right feels arbitrary. The band in between is the game.

The thresholds exist twice — `lib/calibration.mjs` here and
`apps/mobile/src/domain/playtestPolicy.js` in the app — because neither side may
import the other. `test/calibration.test.mjs` asserts the two copies agree.

## Current corpus state

The 40 cards ported from `docs/content/phase0-deck.candidates.json` **do not
pass**, deliberately. They were ported without inventing provenance, so 20
authentic cards sit at Tier C on a single listicle citation, and the deck leaks
two exclusive style markers (`exclCount`, `curlyTypographyCount` — both three
authentic, zero fabricated).

`test/corpus.test.mjs` pins that failure exactly. It exists so the failures
cannot be "fixed" by weakening a threshold: any such change breaks the golden
loudly. When the editorial pass cleans the corpus, the golden inverts and CI
gains a live `validate.mjs` step.
