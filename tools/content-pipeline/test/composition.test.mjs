import assert from "node:assert/strict";
import test from "node:test";

import { compositionReport, totalVariationDistance } from "../lib/composition.mjs";
import { contentWords, sharedContentWordCount, shippableCards } from "../lib/deck.mjs";
import { blockingIssues } from "../lib/issues.mjs";

let seq = 0;
function card(overrides = {}) {
  seq += 1;
  return {
    id: `b1000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    figureId: `c2000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    displayName: `Figure ${seq}`,
    statementText: `a statement number ${seq} of ordinary length for testing purposes`,
    authenticity: seq % 2 === 0 ? "authentic" : "fabricated",
    category: ["music", "film-tv", "sports", "food", "internet"][seq % 5],
    difficultyPrior: (seq % 5) + 1,
    explanation: `explanation number ${seq}`,
    formatFingerprint: `fp-${seq}`,
    eraVocabTag: "2020+",
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    styleFlags: { readsFabricated: true, readsAuthentic: true },
    source: { verificationMethod: "official-transcript" },
    ...overrides,
  };
}

function balancedDeck(n = 20) {
  seq = 0;
  return Array.from({ length: n }, () => card());
}

function codes(cards) {
  return blockingIssues(compositionReport(cards)).map((entry) => entry.code);
}

test("composition: a balanced deck raises no blocking issue", () => {
  const found = codes(balancedDeck(20));
  assert.deepEqual(found, [], JSON.stringify(found));
});

test("composition: an authenticity ratio outside 45-55% blocks (P9)", () => {
  seq = 0;
  const skewed = Array.from({ length: 20 }, (_, i) =>
    card({ authenticity: i < 15 ? "authentic" : "fabricated" }),
  );
  assert.ok(codes(skewed).includes("composition.authentic-ratio"));
});

test("composition: a dominant category blocks", () => {
  seq = 0;
  const deck = Array.from({ length: 20 }, (_, i) => card({ category: i < 12 ? "music" : "sports" }));
  const found = codes(deck);
  assert.ok(found.includes("composition.category-share"));
  assert.ok(found.includes("composition.category-count"));
});

test("composition: the real corpus 'music' share of 47.5% would block", () => {
  seq = 0;
  const deck = Array.from({ length: 40 }, (_, i) =>
    card({ category: i < 19 ? "music" : ["film-tv", "sports", "food", "internet", "awards"][i % 5] }),
  );
  const share = deck.filter((c) => c.category === "music").length / deck.length;
  assert.equal(Number(share.toFixed(3)), 0.475);
  assert.ok(codes(deck).includes("composition.category-share"));
});

test("composition: a repeated format fingerprint blocks (P5)", () => {
  seq = 0;
  const deck = balancedDeck(20);
  deck[0].formatFingerprint = "wanna-feel-old";
  deck[1].formatFingerprint = "wanna-feel-old";
  assert.ok(codes(deck).includes("composition.fingerprint-collision"));
});

test("composition: a figure appearing only as fabricated blocks (P6)", () => {
  seq = 0;
  const deck = balancedDeck(20);
  deck[0].figureId = "shared";
  deck[2].figureId = "shared";
  deck[0].authenticity = "fabricated";
  deck[2].authenticity = "fabricated";
  // Keep the overall ratio legal so only the P6 rule fires.
  deck[1].authenticity = "authentic";
  deck[3].authenticity = "authentic";
  assert.ok(codes(deck).includes("composition.figure-one-sided"));
});

test("composition: a decoy that rewrites its authentic neighbour blocks (P7)", () => {
  seq = 0;
  const deck = balancedDeck(20);
  deck[0].figureId = "shared";
  deck[1].figureId = "shared";
  deck[0].authenticity = "authentic";
  deck[1].authenticity = "fabricated";
  deck[0].statementText = "is meatball an fruit honestly asking";
  deck[1].statementText = "is spaghetti an fruit honestly asking";
  assert.ok(codes(deck).includes("composition.sibling-cards"));
});

test("composition: duplicated explanations block (P8)", () => {
  seq = 0;
  const deck = balancedDeck(20);
  const boilerplate = "Made up for the game — not a real post.";
  for (const entry of deck) entry.explanation = boilerplate;
  assert.ok(codes(deck).includes("composition.duplicate-explanation"));
});

test("composition: missing cross-texture ballast blocks (P4)", () => {
  seq = 0;
  const deck = balancedDeck(20).map((entry) => ({ ...entry, styleFlags: {} }));
  const found = codes(deck);
  assert.ok(found.includes("composition.ballast-authentic"));
  assert.ok(found.includes("composition.ballast-fabricated"));
});

test("composition: uneven style-flag distribution blocks (P1)", () => {
  seq = 0;
  const deck = balancedDeck(20).map((entry) => ({
    ...entry,
    styleFlags: {
      ...entry.styleFlags,
      // Every fabricated card opens mid-thought, no authentic one does.
      opensMidThought: entry.authenticity === "fabricated",
    },
  }));
  assert.ok(codes(deck).includes("composition.style-parity"));
});

test("composition: a length distribution that differs by class blocks (P2)", () => {
  seq = 0;
  const deck = balancedDeck(20).map((entry) => ({
    ...entry,
    statementText: entry.authenticity === "authentic" ? "short one" : "a".repeat(150),
  }));
  assert.ok(codes(deck).includes("composition.bucket-parity"));
});

test("composition: a difficulty level that is entirely one authenticity blocks", () => {
  seq = 0;
  const deck = balancedDeck(20).map((entry) => ({
    ...entry,
    difficultyPrior: entry.authenticity === "authentic" ? 1 : 3,
  }));
  assert.ok(codes(deck).includes("composition.difficulty-authenticity-confound"));
});

test("composition: total variation distance is symmetric and bounded", () => {
  const a = new Map([["x", 0.5], ["y", 0.5]]);
  const b = new Map([["x", 1]]);
  assert.equal(totalVariationDistance(a, b), totalVariationDistance(b, a));
  assert.equal(totalVariationDistance(a, a), 0);
  assert.equal(totalVariationDistance(a, b), 0.5);
});

test("deck: shippable filtering excludes drafts, tombstones, removals and disputes", () => {
  seq = 0;
  const cards = [
    card({ status: "provisional" }),
    card({ status: "draft" }),
    card({ status: "retired" }),
    card({ removalStatus: "removed" }),
    card({ disputed: true }),
    card({ status: "confirmed" }),
  ];
  const tombstoned = cards[5].id;
  const kept = shippableCards(cards, { tombstones: [tombstoned] });
  assert.deepEqual(kept.map((entry) => entry.id), [cards[0].id]);
});

test("deck: content-word overlap ignores stop words", () => {
  assert.ok(!contentWords("the and of it").size);
  assert.equal(sharedContentWordCount("is meatball an fruit", "is spaghetti an fruit"), 1);
  // wanna + feel + today; only old/ancient differ. Three shared content words
  // is exactly the P7 threshold, which is the intent: this pair is the real
  // "wanna feel old" / "wanna feel ancient" collision from the candidate file.
  assert.equal(sharedContentWordCount("wanna feel old today", "wanna feel ancient today"), 3);
});
