/**
 * Surface-tell detection (rubric §4).
 *
 * The property being enforced: an observer who has seen every card, knows every
 * answer, and can compute any function of the surface text alone must not
 * predict authenticity better than base rate.
 *
 * This is a DECK-level gate, never a per-card one. A single unusual card is
 * fine; a *pattern* is the leak. A room cannot articulate "fabricated cards end
 * in a period 95% of the time" — they just start voting FAKE on anything that
 * sounds composed, by round 4, and they are right. That is the failure this
 * module exists to catch before a playtest does.
 *
 * Two independent checks, because they catch different things:
 *   1. Per-feature separation — finds which single feature leaks, so the editor
 *      knows what to rewrite.
 *   2. Leave-one-out classification — finds leakage spread across features that
 *      no single one would reveal.
 */

import { block, result, warn } from "./issues.mjs";
import { mulberry32 } from "./rng.mjs";

const PERMUTATIONS = 2000;
const PERMUTATION_SEED = 20260804;

export const EFFECT_SIZE_LIMIT = 0.5;
export const P_VALUE_LIMIT = 0.05;
export const LOO_BLOCK_LIMIT = 0.62;
export const LOO_WARN_LIMIT = 0.58;
/** A feature present in this many cards of one class and zero of the other is a class marker. */
export const CLASS_MARKER_MIN = 3;

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const INTERNET_TOKENS = /\b(lol|lmao|omg|tbh|idk|imo|u|ur|thx|pls|plz|rn|fr|ngl|smh|bruh|yall|y'all)\b/gi;

function count(text, re) {
  return (text.match(re) ?? []).length;
}

/**
 * Figure-agnostic surface features. Nothing here encodes who said it or what it
 * is about — only how the text is shaped, which is exactly the information a
 * player has before they reason about the figure.
 */
export function extractStyleFeatures(text) {
  const value = String(text);
  const words = value.split(/\s+/).filter(Boolean);
  const letters = value.replace(/[^a-z]/gi, "");
  const upper = value.replace(/[^A-Z]/g, "");
  const allCapsWords = words.filter((word) => word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word));

  return {
    charLength: value.length,
    wordCount: words.length,
    meanWordLength: words.length ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0,
    upperCharRatio: letters.length ? upper.length / letters.length : 0,
    allCapsWordCount: allCapsWords.length,
    startsLowercase: /^[a-z]/.test(value) ? 1 : 0,
    endsWithTerminalPunct: /[.!?]$/.test(value.trim()) ? 1 : 0,
    exclCount: count(value, /!/g),
    questCount: count(value, /\?/g),
    ellipsisCount: count(value, /\.{3}|…/g),
    commaCount: count(value, /,/g),
    emDashCount: count(value, /—|--/g),
    colonCount: count(value, /:/g),
    // Curly typography is a copy-paste provenance signature, not a voice trait:
    // text pasted from an article keeps the outlet's smart quotes, text typed by
    // an editor does not. It is the single strongest leak in the current corpus.
    curlyTypographyCount: count(value, /[’‘“”]/g),
    straightQuoteCount: count(value, /['"]/g),
    emojiCount: count(value, EMOJI_RE),
    digitCount: count(value, /\d/g),
    hashtagCount: count(value, /#[\p{L}\p{N}_]+/gu),
    mentionCount: count(value, /@[\p{L}\p{N}_]+/gu),
    sentenceCount: value.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim()).length || 1,
    repeatedCharRunCount: count(value, /([a-z])\1{2,}/gi),
    internetTokenCount: count(value, INTERNET_TOKENS),
  };
}

export const FEATURE_NAMES = Object.keys(extractStyleFeatures("sample text."));

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function variance(values, mu) {
  if (values.length < 2) return 0;
  return values.reduce((sum, v) => sum + (v - mu) ** 2, 0) / (values.length - 1);
}

/** Standardized mean difference (Cohen's d) with a pooled standard deviation. */
export function effectSize(a, b) {
  const muA = mean(a);
  const muB = mean(b);
  const pooled = Math.sqrt(
    ((a.length - 1) * variance(a, muA) + (b.length - 1) * variance(b, muB)) /
      Math.max(1, a.length + b.length - 2),
  );
  if (pooled === 0) return muA === muB ? 0 : Infinity;
  return (muA - muB) / pooled;
}

/**
 * Seeded permutation test on the difference of means. Exact-ish and
 * distribution-free, which matters because these features are counts with long
 * tails where a t-test's assumptions do not hold.
 */
export function permutationPValue(valuesA, valuesB, seed) {
  const all = [...valuesA, ...valuesB];
  const nA = valuesA.length;
  const observed = Math.abs(mean(valuesA) - mean(valuesB));
  const next = mulberry32(seed);
  let atLeastAsExtreme = 0;

  for (let iteration = 0; iteration < PERMUTATIONS; iteration += 1) {
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const diff = Math.abs(mean(shuffled.slice(0, nA)) - mean(shuffled.slice(nA)));
    if (diff >= observed - 1e-12) atLeastAsExtreme += 1;
  }
  // Add-one smoothing: a p-value of exactly 0 is not a thing a finite
  // permutation test can establish.
  return (atLeastAsExtreme + 1) / (PERMUTATIONS + 1);
}

function gaussianLogPdf(x, mu, varr) {
  const v = Math.max(varr, 1e-6); // floor: a zero-variance feature would be infinitely confident
  return -0.5 * Math.log(2 * Math.PI * v) - ((x - mu) ** 2) / (2 * v);
}

/**
 * Leave-one-out Gaussian naive Bayes. Closed form, deterministic, no iteration,
 * no dependency. Accuracy above chance means the deck leaks.
 */
export function leaveOneOutAccuracy(vectors, labels, featureNames = FEATURE_NAMES) {
  let correct = 0;
  for (let held = 0; held < vectors.length; held += 1) {
    const trainIdx = vectors.map((_, i) => i).filter((i) => i !== held);
    const classes = [true, false];
    let best = null;

    for (const label of classes) {
      const members = trainIdx.filter((i) => labels[i] === label);
      if (members.length < 2) continue;
      let logProb = Math.log(members.length / trainIdx.length);
      for (const name of featureNames) {
        const column = members.map((i) => vectors[i][name]);
        const mu = mean(column);
        logProb += gaussianLogPdf(vectors[held][name], mu, variance(column, mu));
      }
      if (!best || logProb > best.logProb) best = { label, logProb };
    }
    if (best && best.label === labels[held]) correct += 1;
  }
  return vectors.length ? correct / vectors.length : 0;
}

/** One-sided binomial tail: P(X >= observed) under the majority-class baseline. */
export function binomialTailProbability(successes, trials, probability) {
  let logFactorial = 0;
  const logFacts = [0];
  for (let i = 1; i <= trials; i += 1) {
    logFactorial += Math.log(i);
    logFacts[i] = logFactorial;
  }
  let tail = 0;
  for (let k = successes; k <= trials; k += 1) {
    const logCoef = logFacts[trials] - logFacts[k] - logFacts[trials - k];
    tail += Math.exp(logCoef + k * Math.log(probability) + (trials - k) * Math.log(1 - probability));
  }
  return Math.min(1, tail);
}

export function deckTellReport(cards, { seed = PERMUTATION_SEED } = {}) {
  const issues = [];
  const usable = cards.filter((card) => typeof card?.statementText === "string" && card.statementText.length > 0);
  if (usable.length < 8) {
    return { ...result([]), features: [], looAccuracy: null, worstOffenders: [] };
  }

  const vectors = usable.map((card) => extractStyleFeatures(card.statementText));
  const labels = usable.map((card) => card.authenticity === "authentic");
  const authIdx = labels.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const fabIdx = labels.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

  const features = [];
  for (const name of FEATURE_NAMES) {
    const a = authIdx.map((i) => vectors[i][name]);
    const f = fabIdx.map((i) => vectors[i][name]);
    const d = effectSize(a, f);

    // A class marker: present in one class, entirely absent from the other.
    // Caught separately from effect size because a rare-but-exclusive feature
    // (a hashtag in 4 of 20 authentic cards and 0 of 20 fabricated) yields a
    // modest d while being a 100%-precision rule for the player who spots it.
    const aPresent = a.filter((v) => v > 0).length;
    const fPresent = f.filter((v) => v > 0).length;
    const marker =
      (aPresent >= CLASS_MARKER_MIN && fPresent === 0) || (fPresent >= CLASS_MARKER_MIN && aPresent === 0);

    let p = null;
    if (marker || Math.abs(d) > EFFECT_SIZE_LIMIT) {
      p = permutationPValue(a, f, seed);
    }
    features.push({ name, effectSize: d, pValue: p, authPresent: aPresent, fabPresent: fPresent, classMarker: marker });

    if (marker) {
      issues.push(block("tells.class-marker", `deck.features.${name}`,
        `'${name}' appears only in ${aPresent > 0 ? "authentic" : "fabricated"} cards — a style-only rule that never misfires.`,
        { value: { authentic: aPresent, fabricated: fPresent } }));
    } else if (Math.abs(d) > EFFECT_SIZE_LIMIT && p !== null && p < P_VALUE_LIMIT) {
      issues.push(block("tells.feature-separation", `deck.features.${name}`,
        `'${name}' separates the two classes (d=${d.toFixed(2)}, p=${p.toFixed(4)}).`,
        { value: Number(d.toFixed(3)), limit: EFFECT_SIZE_LIMIT }));
    }
  }

  const looAccuracy = leaveOneOutAccuracy(vectors, labels);
  const majority = Math.max(authIdx.length, fabIdx.length) / usable.length;
  const looP = binomialTailProbability(Math.round(looAccuracy * usable.length), usable.length, majority);

  if (looAccuracy > LOO_BLOCK_LIMIT && looP < P_VALUE_LIMIT) {
    issues.push(block("tells.classifier", "deck.looAccuracy",
      `Authenticity is predictable from surface style alone (${(looAccuracy * 100).toFixed(1)}%).`,
      { value: Number(looAccuracy.toFixed(3)), limit: LOO_BLOCK_LIMIT }));
  } else if (looAccuracy > LOO_WARN_LIMIT) {
    issues.push(warn("tells.classifier-drift", "deck.looAccuracy",
      `Surface style is becoming predictive (${(looAccuracy * 100).toFixed(1)}%).`,
      { value: Number(looAccuracy.toFixed(3)), limit: LOO_WARN_LIMIT }));
  }

  // Single-feature LOO, so the report names what to rewrite rather than just
  // reporting that the deck is guessable.
  const ranked = FEATURE_NAMES.map((name) => ({
    name,
    accuracy: leaveOneOutAccuracy(vectors, labels, [name]),
  })).sort((a, b) => b.accuracy - a.accuracy);

  return {
    ...result(issues),
    features,
    looAccuracy,
    looPValue: looP,
    worstOffenders: ranked.slice(0, 5),
  };
}
