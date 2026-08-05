/**
 * Deck composition — properties P1-P10 from editorial-rubric.md §4.2, plus the
 * pool-size requirements from §6.4.
 *
 * These are the checks that make the *deck* the unit of quality rather than the
 * card. A pool of individually-excellent cards still fails here if the fakes
 * cluster on one texture, if a figure only ever appears as a fake, or if two
 * cards are rewrites of each other.
 */

import { block, result, warn } from "./issues.mjs";
import { sharedContentWordCount, splitByAuthenticity } from "./deck.mjs";

export const AUTHENTIC_RATIO_MIN = 0.45;
export const AUTHENTIC_RATIO_MAX = 0.55;
export const BOOLEAN_PARITY_TOLERANCE = 0.15; // P1
export const BUCKET_TV_TOLERANCE = 0.2; // P2
export const MIN_BALLAST_PER_SIDE = 3; // P4
export const MIN_POOL_SIZE = 60; // §6.4
export const MIN_DISTINCT_FIGURES = 20; // §6.4
export const MAX_CATEGORY_SHARE = 0.35;
export const MIN_CATEGORIES = 5;
export const MIN_NON_POST_SHARE = 0.25; // §1.2.1

const BOOLEAN_FLAGS = [
  "hasNonstandardGrammar",
  "punchlineInFinal20Pct",
  "opensMidThought",
  "hasConcreteMundaneDetail",
];

function lenBucket(text) {
  const n = String(text).length;
  if (n < 40) return "<40";
  if (n < 80) return "40-79";
  if (n < 140) return "80-139";
  return "140-180";
}

function proportion(cards, predicate) {
  if (cards.length === 0) return 0;
  return cards.filter(predicate).length / cards.length;
}

function distribution(cards, keyOf) {
  const counts = new Map();
  for (const card of cards) counts.set(keyOf(card), (counts.get(keyOf(card)) ?? 0) + 1);
  const out = new Map();
  for (const [key, n] of counts) out.set(key, n / cards.length);
  return out;
}

/** Total variation distance between two discrete distributions. */
export function totalVariationDistance(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let sum = 0;
  for (const key of keys) sum += Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
  return sum / 2;
}

export function compositionReport(cards) {
  const issues = [];
  if (cards.length === 0) {
    return result([block("composition.empty", "deck.cards", "No shippable cards in the deck.")]);
  }

  const { authentic, fabricated } = splitByAuthenticity(cards);

  // P9 — authenticity ratio.
  const ratio = authentic.length / cards.length;
  if (ratio < AUTHENTIC_RATIO_MIN || ratio > AUTHENTIC_RATIO_MAX) {
    issues.push(block("composition.authentic-ratio", "deck.cards",
      "Authentic share must sit between 45% and 55% for unpredictability (P9).",
      { value: Number(ratio.toFixed(3)), limit: [AUTHENTIC_RATIO_MIN, AUTHENTIC_RATIO_MAX] }));
  }

  // §6.4 — pool size and figure variety.
  if (cards.length < MIN_POOL_SIZE) {
    issues.push(warn("composition.pool-size", "deck.cards",
      "Below the pool size the run-builder needs; runs will repeat.",
      { value: cards.length, limit: MIN_POOL_SIZE }));
  }
  const figureIds = new Set(cards.map((card) => card.figureId));
  if (figureIds.size < MIN_DISTINCT_FIGURES) {
    issues.push(warn("composition.figure-variety", "deck.cards",
      "Too few distinct figures for varied runs.", { value: figureIds.size, limit: MIN_DISTINCT_FIGURES }));
  }

  // Category spread.
  const categories = new Map();
  for (const card of cards) categories.set(card.category, (categories.get(card.category) ?? 0) + 1);
  if (categories.size < MIN_CATEGORIES) {
    issues.push(block("composition.category-count", "deck.cards",
      "Deck needs at least five distinct categories.", { value: categories.size, limit: MIN_CATEGORIES }));
  }
  for (const [category, n] of categories) {
    const share = n / cards.length;
    if (share > MAX_CATEGORY_SHARE) {
      issues.push(block("composition.category-share", `deck.categories.${category}`,
        `Category '${category}' dominates the deck.`,
        { value: Number(share.toFixed(3)), limit: MAX_CATEGORY_SHARE }));
    }
  }

  // difficultyPrior spread — every level present, none dominant.
  const difficulties = new Map();
  for (const card of cards) difficulties.set(card.difficultyPrior, (difficulties.get(card.difficultyPrior) ?? 0) + 1);
  for (let level = 1; level <= 5; level += 1) {
    if (!difficulties.has(level)) {
      issues.push(warn("composition.difficulty-gap", "deck.cards",
        `No cards at difficultyPrior ${level}; the run-builder cannot fill the ramp.`, { value: level }));
    }
  }
  for (const [level, n] of difficulties) {
    if (n / cards.length > 0.4) {
      issues.push(block("composition.difficulty-share", "deck.cards",
        `difficultyPrior ${level} covers more than 40% of the deck.`,
        { value: Number((n / cards.length).toFixed(3)), limit: 0.4 }));
    }
  }
  // A deck where every easy card is authentic is a meta-tell no per-card check
  // sees: the room learns "if I can tell instantly, it's real".
  for (const [level, n] of difficulties) {
    if (n < 4) continue;
    const atLevel = cards.filter((card) => card.difficultyPrior === level);
    const share = proportion(atLevel, (card) => card.authenticity === "authentic");
    if (share === 0 || share === 1) {
      issues.push(block("composition.difficulty-authenticity-confound", "deck.cards",
        `Every card at difficultyPrior ${level} has the same authenticity.`,
        { value: share, limit: "mixed" }));
    }
  }

  // P5 — format fingerprint uniqueness.
  const fingerprints = new Map();
  for (const card of cards) {
    const list = fingerprints.get(card.formatFingerprint) ?? [];
    list.push(card.id);
    fingerprints.set(card.formatFingerprint, list);
  }
  for (const [fingerprint, ids] of fingerprints) {
    if (ids.length > 1) {
      issues.push(block("composition.fingerprint-collision", `deck.fingerprints.${fingerprint}`,
        `Format '${fingerprint}' appears on ${ids.length} cards; seeing one makes the others free (P5).`,
        { value: ids }));
    }
  }

  // P6 / P7 — per-figure balance and sibling detection.
  const byFigure = new Map();
  for (const card of cards) {
    const list = byFigure.get(card.figureId) ?? [];
    list.push(card);
    byFigure.set(card.figureId, list);
  }
  for (const [figureId, group] of byFigure) {
    if (group.length < 2) continue;
    const hasAuthentic = group.some((card) => card.authenticity === "authentic");
    const hasFabricated = group.some((card) => card.authenticity === "fabricated");
    if (!hasAuthentic || !hasFabricated) {
      issues.push(block("composition.figure-one-sided", `deck.figures.${figureId}`,
        `${group[0].displayName} appears only as ${hasAuthentic ? "authentic" : "fabricated"} cards — a free win once the room notices (P6).`,
        { value: group.length }));
    }
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const shared = sharedContentWordCount(group[i].statementText, group[j].statementText);
        if (shared >= 3) {
          issues.push(block("composition.sibling-cards", `deck.figures.${figureId}`,
            `Two cards for ${group[0].displayName} share ${shared} content words — the decoy is a rewrite of the real one (P7).`,
            { value: [group[i].id, group[j].id] }));
        }
      }
    }
  }

  // P8 — explanation uniqueness. The reveal is a payoff screen, not a disclaimer.
  const explanations = new Map();
  for (const card of cards) {
    const key = (card.explanation ?? "").trim().toLowerCase();
    const list = explanations.get(key) ?? [];
    list.push(card.id);
    explanations.set(key, list);
  }
  for (const [, ids] of explanations) {
    if (ids.length > 1) {
      issues.push(block("composition.duplicate-explanation", "deck.cards",
        `${ids.length} cards share one explanation; every reveal must say what was invented and why it was believable (P8).`,
        { value: ids.slice(0, 6) }));
    }
  }

  // P1 — boolean feature parity between the two classes.
  for (const flag of BOOLEAN_FLAGS) {
    const pA = proportion(authentic, (card) => card.styleFlags?.[flag] === true);
    const pF = proportion(fabricated, (card) => card.styleFlags?.[flag] === true);
    const gap = Math.abs(pA - pF);
    if (gap > BOOLEAN_PARITY_TOLERANCE) {
      issues.push(block("composition.style-parity", `deck.styleFlags.${flag}`,
        `'${flag}' is distributed unevenly across the two classes (P1).`,
        { value: Number(gap.toFixed(3)), limit: BOOLEAN_PARITY_TOLERANCE }));
    }
  }

  // P2 — bucketed distribution parity.
  const buckets = [
    ["lenBucket", (card) => lenBucket(card.statementText)],
    ["eraVocabTag", (card) => card.eraVocabTag ?? "unknown"],
  ];
  for (const [name, keyOf] of buckets) {
    const tv = totalVariationDistance(distribution(authentic, keyOf), distribution(fabricated, keyOf));
    if (tv > BUCKET_TV_TOLERANCE) {
      issues.push(block("composition.bucket-parity", `deck.${name}`,
        `'${name}' distributions differ between the two classes (P2).`,
        { value: Number(tv.toFixed(3)), limit: BUCKET_TV_TOLERANCE }));
    }
  }

  // P4 — cross-texture ballast. The property that actively breaks meta-learning
  // rather than merely not creating it.
  const readsFabricated = authentic.filter((card) => card.styleFlags?.readsFabricated === true).length;
  const readsAuthentic = fabricated.filter((card) => card.styleFlags?.readsAuthentic === true).length;
  if (readsFabricated < MIN_BALLAST_PER_SIDE) {
    issues.push(block("composition.ballast-authentic", "deck.cards",
      "Not enough authentic cards that read fabricated — the room is never punished for pattern-matching on polish (P4).",
      { value: readsFabricated, limit: MIN_BALLAST_PER_SIDE }));
  }
  if (readsAuthentic < MIN_BALLAST_PER_SIDE) {
    issues.push(block("composition.ballast-fabricated", "deck.cards",
      "Not enough fabricated cards that read authentic (P4).",
      { value: readsAuthentic, limit: MIN_BALLAST_PER_SIDE }));
  }

  // §1.2.1 — non-post provenance share.
  const nonPost = authentic.filter((card) =>
    ["official-transcript", "institutional-archive", "licensed-dataset"].includes(card.source?.verificationMethod),
  ).length;
  if (authentic.length > 0 && nonPost / authentic.length < MIN_NON_POST_SHARE) {
    issues.push(warn("composition.non-post-share", "deck.cards",
      "Under a quarter of authentic cards come from primary non-post records; the authentic style distribution stays narrow.",
      { value: Number((nonPost / authentic.length).toFixed(3)), limit: MIN_NON_POST_SHARE }));
  }

  return result(issues);
}
