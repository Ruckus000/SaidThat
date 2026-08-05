import assert from "node:assert/strict";
import test from "node:test";

import {
  binomialTailProbability,
  deckTellReport,
  effectSize,
  extractStyleFeatures,
  leaveOneOutAccuracy,
  permutationPValue,
  LOO_BLOCK_LIMIT,
} from "../lib/tells.mjs";
import { drawVector, mulberry32, seededShuffle } from "../lib/rng.mjs";
import { loadDeck } from "../lib/deck.mjs";
import { blockingIssues } from "../lib/issues.mjs";

test("rng: mulberry32 is deterministic and matches the shared test vector", () => {
  assert.deepEqual(drawVector(7, 5), drawVector(7, 5));
  assert.notDeepEqual(drawVector(7, 5), drawVector(8, 5));
  // Pinned so apps/mobile/src/domain/rng.js cannot drift from this copy.
  const first = mulberry32(7)();
  assert.equal(Number(first.toFixed(9)), drawVector(7, 1)[0]);
});

test("rng: seeded shuffle is a permutation and does not mutate its input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = seededShuffle(input, 42);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), input);
  assert.deepEqual(seededShuffle(input, 42), shuffled);
});

test("tells: style features are figure-agnostic surface counts", () => {
  const f = extractStyleFeatures("WOW! it’s a test... really?");
  assert.equal(f.exclCount, 1);
  assert.equal(f.questCount, 1);
  assert.equal(f.ellipsisCount, 1);
  assert.equal(f.curlyTypographyCount, 1);
  assert.equal(f.allCapsWordCount, 1);
  assert.equal(f.startsLowercase, 0);
});

test("tells: effect size and permutation p-value behave on separated samples", () => {
  const a = [10, 11, 12, 10, 11];
  const b = [1, 2, 1, 2, 1];
  assert.ok(Math.abs(effectSize(a, b)) > 2);
  assert.ok(permutationPValue(a, b, 1) < 0.05);
  // Identical samples must not look separated.
  assert.equal(effectSize(a, [...a]), 0);
  assert.ok(permutationPValue(a, [...a], 1) > 0.5);
});

test("tells: permutation p-values are reproducible for a fixed seed", () => {
  const a = [3, 5, 2, 8, 1, 4];
  const b = [7, 6, 9, 5, 8, 7];
  assert.equal(permutationPValue(a, b, 99), permutationPValue(a, b, 99));
});

test("tells: leave-one-out recovers a planted separation and rejects noise", () => {
  const separated = [
    ...Array.from({ length: 8 }, () => ({ charLength: 100, exclCount: 3 })),
    ...Array.from({ length: 8 }, () => ({ charLength: 20, exclCount: 0 })),
  ];
  const labels = [...Array(8).fill(true), ...Array(8).fill(false)];
  assert.ok(leaveOneOutAccuracy(separated, labels, ["charLength", "exclCount"]) > 0.9);

  // Same value in both classes carries no information.
  const flat = Array.from({ length: 16 }, () => ({ charLength: 50 }));
  assert.ok(leaveOneOutAccuracy(flat, labels, ["charLength"]) <= 0.6);
});

test("tells: binomial tail probability is a valid one-sided p-value", () => {
  assert.ok(binomialTailProbability(20, 20, 0.5) < 0.001);
  assert.ok(binomialTailProbability(10, 20, 0.5) > 0.4);
  assert.equal(Number(binomialTailProbability(0, 10, 0.5).toFixed(6)), 1);
});

test("tells: a texture-matched deck raises no blocking issue", () => {
  // Same surface habits on both sides; only the label differs.
  const texts = [
    "anyway i bought the wrong screws at the hardware store",
    "ok but why does the toaster have a bagel setting",
    "update: the dog has still not looked at me",
    "so apparently you can just buy a whole cake",
    "i have been saying it wrong for thirty years",
    "the hotel gave me two pillows and no explanation",
    "genuinely why is there a second sink in here",
    "i keep forgetting which pocket has the keys",
    "there were four of them and now there are three",
    "somebody put the milk back completely empty",
    "i have looked at this receipt for ten minutes",
    "the neighbour waved and i panicked and saluted",
  ];
  const cards = texts.map((statementText, i) => ({
    statementText,
    authenticity: i % 2 === 0 ? "authentic" : "fabricated",
  }));
  const report = deckTellReport(cards);
  assert.deepEqual(blockingIssues(report).map((entry) => entry.code), []);
});

test("tells: a class marker present in one class only is blocked", () => {
  const cards = [
    ...Array.from({ length: 6 }, (_, i) => ({ statementText: `real card number ${i}!`, authenticity: "authentic" })),
    ...Array.from({ length: 6 }, (_, i) => ({ statementText: `fake card number ${i}`, authenticity: "fabricated" })),
  ];
  const report = deckTellReport(cards);
  const markers = blockingIssues(report)
    .filter((entry) => entry.code === "tells.class-marker")
    .map((entry) => entry.path.replace("deck.features.", ""));
  // "!" is exclusive to the authentic side here; so is terminal punctuation,
  // because the fabricated texts were written without it.
  assert.ok(markers.includes("exclCount"), `expected exclCount marker, got ${markers}`);
});

test("tells: the report is deterministic across runs", () => {
  const cards = [
    ...Array.from({ length: 7 }, (_, i) => ({ statementText: `one two three ${i}`, authenticity: "authentic" })),
    ...Array.from({ length: 7 }, (_, i) => ({ statementText: `four five ${i}.`, authenticity: "fabricated" })),
  ];
  const a = deckTellReport(cards);
  const b = deckTellReport(cards);
  assert.deepEqual(a.issues, b.issues);
  assert.equal(a.looAccuracy, b.looAccuracy);
});

// ---------------------------------------------------------------------------
// Regression pin on the real ported corpus.
//
// The 40 candidates in docs/content/phase0-deck.candidates.json are partly
// self-solving. Measured, the leak is narrower than a casual read suggests but
// real where it counts:
//
//   exclCount            3 authentic / 0 fabricated  — exclusive class marker
//   curlyTypographyCount 3 authentic / 0 fabricated  — exclusive class marker
//   leave-one-out accuracy 0.60 (warn band; p=0.13, not significant on n=40)
//
// The two markers are what matter. A feature present in several cards of one
// class and *none* of the other is a rule that never misfires for the player
// who spots it, regardless of how modest its effect size looks — which is why
// the marker check exists separately from the effect-size test. Curly quotes in
// particular are not a voice trait at all: they are a copy-paste signature from
// the source article, i.e. the deck leaking its own production process.
//
// This test asserts the detector still sees the leak, so a future "cleanup"
// that silently normalises the corpus cannot make it invisible instead of
// fixing it. CP-04 fixes the corpus; when it does, this test flips to asserting
// the leak is GONE — it is not deleted.
// ---------------------------------------------------------------------------
test("tells: the ported candidate corpus leaks authenticity through surface style", async () => {
  const { cards } = await loadDeck("pop-voices");
  const report = deckTellReport(cards);
  const blocking = blockingIssues(report);

  const markers = blocking
    .filter((entry) => entry.code === "tells.class-marker")
    .map((entry) => entry.path.replace("deck.features.", ""));

  for (const feature of ["exclCount", "curlyTypographyCount"]) {
    assert.ok(markers.includes(feature), `expected '${feature}' to be a one-sided class marker, got ${markers}`);
  }

  // The corpus must not pass the tell gate as it stands.
  assert.equal(report.ok, false);

  // Whole-vector leakage sits in the warn band rather than the block band.
  // Pinned as a range so CP-04 must move it down, not merely jiggle it.
  assert.ok(
    report.looAccuracy > 0.55 && report.looAccuracy <= LOO_BLOCK_LIMIT,
    `expected leave-one-out accuracy in (0.55, ${LOO_BLOCK_LIMIT}], got ${report.looAccuracy}`,
  );
  assert.ok(report.worstOffenders.length > 0);
});
