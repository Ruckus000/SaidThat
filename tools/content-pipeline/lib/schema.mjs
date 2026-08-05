/**
 * Structural validation for editorial card records.
 *
 * Hand-rolled rather than Zod: there is no root package.json to install a
 * dependency into, `apps/mobile/src/content/validateDeck.js` already validates
 * in this idiom, and the editor report needs issue lists keyed by rule code
 * rather than a parse-error tree.
 *
 * The editorial record is the canonical card shape. The runtime record shipped
 * to the app is a projection of it (see lib/emit.mjs), not a separate source of
 * truth.
 */

import { block, result, warn } from "./issues.mjs";

export const AUTHENTICITY = new Set(["authentic", "fabricated"]);
export const SENSITIVITY = ["everyone", "teen", "mature"];
export const SOURCE_TIERS = new Set(["A", "B", "C"]);
export const DECOY_METHODS = new Set(["human", "ai_assisted", "none"]);
export const REMOVAL_STATUS = new Set(["active", "removed", "hidden"]);
export const CARD_STATUS = new Set(["draft", "provisional", "watch", "confirmed", "retired"]);
export const RIGHTS_STATUS = new Set([
  "unknown",
  "licensed",
  "public_domain",
  "fair_use_claim",
  "original",
]);
export const VERIFICATION_METHODS = new Set([
  "web-archive",
  "contemporaneous-article",
  "official-transcript",
  "licensed-dataset",
  "institutional-archive",
]);

/**
 * Controlled vocabulary for P5 (no fingerprint twice in a deck). Kept as a set
 * rather than free text so that "the decoy is a rewrite of the real one" is
 * mechanically detectable instead of relying on an editor noticing.
 */
export const FORMAT_FINGERPRINTS = new Set([
  "food-taxonomy-question",
  "first-time-trying-x",
  "wanna-feel-old",
  "band-name-pun",
  "dialogue-with-stranger",
  "age-arc-list",
  "addressing-another-celebrity",
  "self-deprecating-career-reference",
  "domestic-appliance-defeat",
  "misread-a-word",
  "aphorism",
  "unprompted-food-opinion",
  "late-night-confession",
  "travel-complaint",
  "sincere-non-sequitur",
  "pet-report",
  "technology-bafflement",
  "weather-observation",
  "self-correction",
  "gratitude-post",
]);

export const MAX_STATEMENT_LENGTH = 500; // schema ceiling; D3 imposes the real 180 limit
export const MAX_EXPLANATION_LENGTH = 600;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export function sensitivityRank(value) {
  return SENSITIVITY.indexOf(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Distinct approver identities. Mirrors the `Array.isArray` guard in
 * `hasTwoDistinctApprovals`: a bare string "alice" spread into a Set yields
 * five "distinct" entries, so a non-array must count as zero, never as its
 * character count.
 */
export function distinctApprovers(approvals) {
  if (!Array.isArray(approvals)) return [];
  const seen = new Set();
  for (const entry of approvals) {
    const editor = typeof entry === "string" ? entry : entry?.editor;
    if (isNonEmptyString(editor) && entry?.decision !== "reject") seen.add(editor.trim());
  }
  return [...seen];
}

export function independentCitationCount(citations) {
  if (!Array.isArray(citations)) return 0;
  return citations.filter((entry) => entry && entry.independent === true).length;
}

function validateSource(card, path, issues) {
  const { source } = card;
  if (card.authenticity === "fabricated") {
    if (source != null) {
      issues.push(block("schema.fabricated-has-source", `${path}.source`,
        "A fabricated card must not carry a source record."));
    }
    return;
  }
  if (!source || typeof source !== "object") {
    issues.push(block("schema.authentic-missing-source", `${path}.source`,
      "An authentic card requires a source record."));
    return;
  }
  if (typeof source.url !== "string" || !source.url.startsWith("https://")) {
    issues.push(block("schema.source-url", `${path}.source.url`,
      "Source URL must be an https:// URL.", { value: source.url ?? null }));
  }
  if (source.retained !== true) {
    issues.push(block("schema.source-not-retained", `${path}.source.retained`,
      "Editor must confirm the source record is retained before the card can ship."));
  }
  if (!VERIFICATION_METHODS.has(source.verificationMethod)) {
    issues.push(block("schema.verification-method", `${path}.source.verificationMethod`,
      `Unknown verification method.`, { value: source.verificationMethod ?? null }));
  }
  if (!RIGHTS_STATUS.has(source.rightsStatus)) {
    issues.push(block("schema.rights-status", `${path}.source.rightsStatus`,
      "Unknown rights status.", { value: source.rightsStatus ?? null }));
  }
}

function validateProvenance(card, path, issues) {
  if (card.authenticity !== "authentic") return;
  // G7 — Tier C never ships as authentic.
  if (!SOURCE_TIERS.has(card.sourceTier)) {
    issues.push(block("schema.source-tier", `${path}.sourceTier`,
      "Authentic cards require a source tier of A, B or C.", { value: card.sourceTier ?? null }));
    return;
  }
  if (card.sourceTier === "C") {
    issues.push(block("provenance.tier-c", `${path}.sourceTier`,
      "Tier C provenance (single aggregator, or citations sharing one origin) never ships as authentic."));
  }
  // G8 — two independent citations.
  const independent = independentCitationCount(card.citations);
  if (independent < 2) {
    issues.push(block("provenance.independent-citations", `${path}.citations`,
      "Authentic cards need at least two independent citations.",
      { value: independent, limit: 2 }));
  }
}

export function validateEditorialCard(card, { figures = new Map(), index = 0 } = {}) {
  const path = `cards[${index}]`;
  const issues = [];

  if (!card || typeof card !== "object") {
    return result([block("schema.not-an-object", path, "Card record must be an object.")]);
  }

  if (!isUuid(card.id)) {
    issues.push(block("schema.id", `${path}.id`, "Card id must be a UUID.", { value: card.id ?? null }));
  }
  if (!isUuid(card.figureId)) {
    issues.push(block("schema.figure-id", `${path}.figureId`, "figureId must be a UUID.", { value: card.figureId ?? null }));
  } else if (figures.size > 0 && !figures.has(card.figureId)) {
    issues.push(block("schema.figure-unknown", `${path}.figureId`,
      "figureId does not resolve in figures.json.", { value: card.figureId }));
  } else if (figures.get(card.figureId)?.likenessAllowed === false) {
    issues.push(block("safety.likeness-not-allowed", `${path}.figureId`,
      "This figure is marked likenessAllowed: false."));
  }

  if (!isNonEmptyString(card.displayName)) {
    issues.push(block("schema.display-name", `${path}.displayName`, "displayName is required."));
  } else if (figures.has(card.figureId) && figures.get(card.figureId).displayName !== card.displayName) {
    issues.push(block("schema.display-name-mismatch", `${path}.displayName`,
      "displayName disagrees with figures.json.", { value: card.displayName }));
  }

  if (!isNonEmptyString(card.statementText)) {
    issues.push(block("schema.statement", `${path}.statementText`, "statementText is required."));
  } else if (card.statementText.length > MAX_STATEMENT_LENGTH) {
    issues.push(block("schema.statement-length", `${path}.statementText`,
      "statementText exceeds the schema ceiling.",
      { value: card.statementText.length, limit: MAX_STATEMENT_LENGTH }));
  }

  if (!AUTHENTICITY.has(card.authenticity)) {
    issues.push(block("schema.authenticity", `${path}.authenticity`,
      "authenticity must be 'authentic' or 'fabricated'.", { value: card.authenticity ?? null }));
  }

  if (!isNonEmptyString(card.explanation)) {
    issues.push(block("schema.explanation", `${path}.explanation`, "explanation is required — it is the reveal payoff."));
  } else if (card.explanation.length > MAX_EXPLANATION_LENGTH) {
    issues.push(block("schema.explanation-length", `${path}.explanation`,
      "explanation exceeds the schema ceiling.",
      { value: card.explanation.length, limit: MAX_EXPLANATION_LENGTH }));
  }

  if (!isNonEmptyString(card.category)) {
    issues.push(block("schema.category", `${path}.category`, "category is required."));
  }
  if (sensitivityRank(card.sensitivity) < 0) {
    issues.push(block("schema.sensitivity", `${path}.sensitivity`,
      "sensitivity must be everyone, teen or mature.", { value: card.sensitivity ?? null }));
  }
  if (!CARD_STATUS.has(card.status)) {
    issues.push(block("schema.status", `${path}.status`, "Unknown card status.", { value: card.status ?? null }));
  }
  if (!REMOVAL_STATUS.has(card.removalStatus)) {
    issues.push(block("schema.removal-status", `${path}.removalStatus`,
      "Unknown removal status.", { value: card.removalStatus ?? null }));
  }
  if (typeof card.disputed !== "boolean") {
    issues.push(block("schema.disputed", `${path}.disputed`, "disputed must be a boolean."));
  }
  if (!FORMAT_FINGERPRINTS.has(card.formatFingerprint)) {
    issues.push(block("schema.format-fingerprint", `${path}.formatFingerprint`,
      "formatFingerprint must come from the controlled vocabulary.",
      { value: card.formatFingerprint ?? null }));
  }

  // difficultyPrior, not difficulty: an editorial guess used only until the
  // calibration loop has real per-bucket data. See editorial-rubric.md §5.4.
  if ("difficulty" in card) {
    issues.push(block("schema.difficulty-renamed", `${path}.difficulty`,
      "Use difficultyPrior — a flat difficulty scalar is a category error (rubric §5.4)."));
  }
  if (!Number.isInteger(card.difficultyPrior) || card.difficultyPrior < 1 || card.difficultyPrior > 5) {
    issues.push(block("schema.difficulty-prior", `${path}.difficultyPrior`,
      "difficultyPrior must be an integer 1-5.", { value: card.difficultyPrior ?? null }));
  }

  if (!DECOY_METHODS.has(card.decoyMethod)) {
    issues.push(block("schema.decoy-method", `${path}.decoyMethod`,
      "decoyMethod must be human, ai_assisted or none.", { value: card.decoyMethod ?? null }));
  } else if (card.authenticity === "fabricated" && card.decoyMethod === "none") {
    issues.push(block("schema.decoy-method-required", `${path}.decoyMethod`,
      "A fabricated card must record how its decoy was written."));
  } else if (card.authenticity === "authentic" && card.decoyMethod !== "none") {
    issues.push(block("schema.decoy-method-on-authentic", `${path}.decoyMethod`,
      "An authentic card has no decoy method."));
  }

  validateSource(card, path, issues);
  validateProvenance(card, path, issues);

  // Two-person rule. Draft cards are exempt so a work-in-progress corpus can be
  // committed and reviewed; anything at provisional or beyond is claiming to be
  // playable and must carry the approvals.
  const approvers = distinctApprovers(card.editorialApprovals);
  if (card.status !== "draft" && approvers.length < 2) {
    issues.push(block("editorial.two-person-rule", `${path}.editorialApprovals`,
      "Cards naming a real figure need two distinct editorial approvals.",
      { value: approvers.length, limit: 2 }));
  }
  if (card.decoyMethod === "ai_assisted" && card.status !== "draft" && !isNonEmptyString(card.editorialNotes)) {
    issues.push(block("editorial.ai-assist-ownership", `${path}.editorialNotes`,
      "An AI-assisted decoy must record which editor rewrote and owns the final text."));
  }

  if (card.authenticity === "fabricated" && !/made up|not a real post|written for (the|this) game|invented/i.test(card.explanation ?? "")) {
    issues.push(block("editorial.fabrication-not-disclosed", `${path}.explanation`,
      "A fabricated card's explanation must state that the statement was invented for the game."));
  }

  if (card.transcriptionExact !== true && card.authenticity === "authentic") {
    issues.push(warn("editorial.transcription-not-exact", `${path}.transcriptionExact`,
      "Authentic wording should be transcribed exactly; typos and casing are authenticity texture."));
  }

  return result(issues);
}

export function validateFigure(figure, index = 0) {
  const path = `figures[${index}]`;
  const issues = [];
  if (!figure || typeof figure !== "object") {
    return result([block("schema.not-an-object", path, "Figure record must be an object.")]);
  }
  if (!isUuid(figure.figureId)) {
    issues.push(block("schema.figure-id", `${path}.figureId`, "figureId must be a UUID."));
  }
  if (!isNonEmptyString(figure.displayName)) {
    issues.push(block("schema.display-name", `${path}.displayName`, "displayName is required."));
  }
  if (typeof figure.likenessAllowed !== "boolean") {
    issues.push(block("schema.likeness-allowed", `${path}.likenessAllowed`,
      "likenessAllowed must be a boolean."));
  }
  if (!Array.isArray(figure.voiceBank) || figure.voiceBank.length === 0) {
    issues.push(warn("editorial.voice-bank-empty", `${path}.voiceBank`,
      "Without a Voice Bank entry, decoys for this figure are written against an imagined celebrity."));
  }
  return result(issues);
}

export function validateDeckManifest(manifest) {
  const issues = [];
  if (!manifest || typeof manifest !== "object") {
    return result([block("schema.not-an-object", "deck", "Deck manifest must be an object.")]);
  }
  if (!isUuid(manifest.deckId)) {
    issues.push(block("schema.deck-id", "deck.deckId", "deckId must be a UUID."));
  }
  if (!isNonEmptyString(manifest.slug)) {
    issues.push(block("schema.deck-slug", "deck.slug", "slug is required."));
  }
  if (!isNonEmptyString(manifest.title)) {
    issues.push(block("schema.deck-title", "deck.title", "title is required."));
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.contentVersion ?? "")) {
    issues.push(block("schema.content-version", "deck.contentVersion",
      "contentVersion must be semver.", { value: manifest.contentVersion ?? null }));
  }
  if (sensitivityRank(manifest.sensitivity) < 0) {
    issues.push(block("schema.deck-sensitivity", "deck.sensitivity",
      "Deck sensitivity must be everyone, teen or mature."));
  }
  if (!Array.isArray(manifest.tombstones)) {
    issues.push(block("schema.tombstones", "deck.tombstones", "tombstones must be an array."));
  }
  return result(issues);
}
