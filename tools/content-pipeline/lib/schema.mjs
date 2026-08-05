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
/**
 * A well-formed Wayback capture URL: host, 14-digit timestamp, then the target.
 *
 * Lives here rather than in `bin/verify-candidates.mjs` because the offline
 * gate and the online checker must agree on what an archive URL even looks
 * like. They disagreeing is how `source.archiveUrl` came to hold live
 * twitter.com links on cards that shipped as AUTHENTIC.
 */
// Case-insensitive on the host because DNS is: a capture URL written
// WEB.ARCHIVE.ORG is the same capture, and rejecting it would send an editor
// hunting for a provenance fault that isn't there.
export const WAYBACK_CAPTURE_RE = /^https?:\/\/web\.archive\.org\/web\/(\d{14})\//i;

/** Verification methods whose name is a claim about an archive capture. */
export const ARCHIVE_METHODS = new Map([
  ["web-archive", 1],
  ["archive-double-capture", 2],
]);

export const VERIFICATION_METHODS = new Set([
  "web-archive",
  "archive-double-capture",
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
  "training-log",
  "unsolicited-request",
  "recognised-in-public",
  "name-misspelled",
  "morning-report",
  "celebrity-encounter",
  "household-inventory",
  "overheard-remark",
  "acceptance-speech-opener",
  "press-conference-deadpan",
  "professional-confession",
  "hypothetical-question",
  "product-complaint",
  "late-night-instruction",
  "unexplained-declaration",
  "era-lament",
  "cooking-improvisation",
  "travel-logistics",
  "animal-observation",
  "body-bafflement",
  "career-retrospective",
  "small-victory",
  "mistaken-identity",
  "stubborn-preference",
  "kitchen-mishap",
  "queue-grievance",
  "sleep-report",
  "laundry-defeat",
  "parcel-saga",
  "neighbour-report",
  "gym-report",
  "haircut-report",
  "phone-battery",
  "wrong-train",
  "supermarket-observation",
  "weather-complaint",
  "pet-negotiation",
  "instruction-manual",
  "birthday-report",
  "coffee-order",
  "lost-item",
  "doorbell-incident",
  "shoe-problem",
  "plant-care",
  "tv-remote",
  "seasonal-confession",
  "restaurant-report",
  "umbrella-incident",
  "mild-injury",
  "unread-email",
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
 * Pre-release owner approval marker. Must match OWNER_APPROVAL in
 * apps/mobile/src/domain/game.js — asserted by test/approvals.test.mjs.
 */
export const OWNER_APPROVAL = "owner:pre-release";

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

/**
 * The registrable host of a citation URL, or null if there isn't one.
 *
 * Deliberately not `new URL()`, matching `sourceHost` in the app's
 * presentationLabels.js: a malformed citation must degrade to "no host" so the
 * count falls back to conservative. A validator that throws halfway through a
 * card reports nothing at all, which is the worst outcome for a gate.
 */
export function citationHost(url) {
  const match = typeof url === "string" ? url.match(/^https?:\/\/([^/?#]+)/i) : null;
  return match ? match[1].toLowerCase().replace(/^www\./, "") : null;
}

/**
 * Independent records among the citations.
 *
 * `independent` is a hand-typed boolean, so it cannot be the whole test: two
 * citations to the same outlet are one record no matter what the flag says, and
 * an outlet that reprints its own wire copy under two URLs is the single most
 * likely way for the two-record bar at `validateProvenance` to be cleared by
 * accident. Counting distinct hosts makes the flag a necessary condition rather
 * than a sufficient one. A citation with no parseable host counts as nothing —
 * a record you cannot name the origin of is not corroboration.
 */
export function independentCitationCount(citations) {
  if (!Array.isArray(citations)) return 0;
  const hosts = new Set();
  for (const entry of citations) {
    if (!entry || entry.independent !== true) continue;
    const host = citationHost(entry.url);
    if (host) hosts.add(host);
  }
  return hosts.size;
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
  // A field named archiveUrl must hold an archive. Thirteen cards shipped with
  // a live twitter.com permalink in it, because nothing read the field at all —
  // so the name asserted a capture that the record never contained.
  if (source.archiveUrl != null && !WAYBACK_CAPTURE_RE.test(String(source.archiveUrl))) {
    issues.push(block("provenance.archive-url-shape", `${path}.source.archiveUrl`,
      "archiveUrl must be a Wayback capture URL (https://web.archive.org/web/<14-digit timestamp>/...). Put the canonical link in source.url.",
      { value: source.archiveUrl }));
  }
}

/**
 * Distinct archive captures of the canonical URL, byte-compared for wording.
 *
 * Recorded separately from `citations` because they answer a different
 * question. A citation is evidence the statement EXISTS; a capture is evidence
 * of what it SAYS. Conflating them is how an editor ends up trusting an outlet
 * for wording.
 */
/**
 * The distinct, well-formed capture timestamps on a source record.
 *
 * Deduplicates the TIMESTAMPS, not the entries. Captures are written as
 * `{ timestamp }` objects everywhere in this corpus, and two object literals
 * carrying the same timestamp are distinct references — so building the Set
 * over entries counted one capture pasted twice as two records, which is
 * exactly the bar `validateProvenance` exists to enforce.
 */
export function captureTimestamps(source) {
  if (!Array.isArray(source?.captures)) return [];
  const stamps = source.captures
    .map((entry) => String(entry?.timestamp ?? entry))
    .filter((stamp) => /^\d{14}$/.test(stamp));
  return [...new Set(stamps)];
}

export function captureCount(source) {
  return captureTimestamps(source).length;
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

  // G8 — two independent records, where an archive capture counts.
  //
  // Amended 2026-08-05 on evidence. The original rule demanded two independent
  // SECONDARY citations, which assumed outlets are reliable for wording. They
  // are not: BuzzFeed's transcription of a Larry King post silently dropped a
  // hashtag, a line break and a trailing ellipsis, and the cleanest-looking
  // quotes were the most heavily edited. Since the rubric treats typos as the
  // card, an outlet is the worst possible source for the exact string.
  //
  // Two independent captures of the canonical URL, byte-compared, are stronger
  // evidence of wording than any article quote — the capture IS the post. So
  // either pair satisfies the bar, and `wordingSource` below tightens what may
  // supply the string in the first place.
  // An official verbatim transcript or institutional archive is itself a
  // primary record — the awarding body's own account of what was said, not a
  // retelling. Its archive capture is a SECOND record, because it pins what
  // that page said on a date and so guards against a later silent edit.
  const primaryRecord = ["official-transcript", "institutional-archive", "licensed-dataset"].includes(
    card.source?.verificationMethod,
  )
    ? 1
    : 0;
  // A citation flagged independent but carrying no usable URL counts as nothing
  // above. Say so directly: otherwise the card fails with "needs two records"
  // while appearing, to the editor reading the JSON, to have two.
  for (const [i, entry] of (Array.isArray(card.citations) ? card.citations : []).entries()) {
    if (entry?.independent === true && !citationHost(entry.url)) {
      issues.push(block("provenance.citation-url", `${path}.citations[${i}].url`,
        "A citation offered as an independent record needs a URL with a host — an origin you cannot name is not corroboration.",
        { value: entry?.url ?? null }));
    }
  }

  const independent = independentCitationCount(card.citations);
  const captures = captureCount(card.source);

  // A verification method that names an archive must have the captures to show
  // for it. Six cards declared `web-archive` with an empty `captures` array:
  // the method field asserted an archive nobody had recorded, and the two-record
  // bar below was met by citations alone. Read literally, the card claimed a
  // form of evidence it did not hold.
  const requiredCaptures = ARCHIVE_METHODS.get(card.source?.verificationMethod) ?? 0;
  if (requiredCaptures > 0 && captures < requiredCaptures) {
    issues.push(block("provenance.archive-method-without-capture", `${path}.source.captures`,
      `verificationMethod '${card.source.verificationMethod}' claims ${requiredCaptures} archive capture(s), but ${captures} distinct capture timestamp(s) are recorded. Record the captures, or name the method the card actually has.`,
      { value: captures, limit: requiredCaptures }));
  }

  const records = independent + captures + primaryRecord;
  if (records < 2) {
    issues.push(block("provenance.independent-records", `${path}.citations`,
      "Authentic cards need two independent records: citations, archive captures of the canonical URL, or a primary transcript plus its capture.",
      { value: { citations: independent, captures, primaryRecord }, limit: 2 }));
  }

  // Wording must come from a primary record, never from an outlet's retelling.
  if (card.wordingSource === "article") {
    issues.push(block("provenance.wording-from-article", `${path}.wordingSource`,
      "Exact wording may not be taken from an article — outlets silently tidy typos, hashtags and line breaks."));
  }
  if (captures === 1 && independent < 1) {
    issues.push(warn("provenance.single-capture", `${path}.source.captures`,
      "One capture and no independent citation: wording is confirmed once rather than cross-checked."));
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
  const ownerApproved = approvers.includes(OWNER_APPROVAL);
  if (card.status !== "draft" && approvers.length < 2 && !ownerApproved) {
    issues.push(block("editorial.two-person-rule", `${path}.editorialApprovals`,
      `Cards naming a real figure need two distinct editorial approvals, or an explicit '${OWNER_APPROVAL}' during pre-release.`,
      { value: approvers.length, limit: 2 }));
  }
  // Visible in every report rather than silent: a deck carried by one approver
  // is a real gap in review, and it should stay legible as one.
  if (ownerApproved && approvers.length < 2) {
    issues.push(warn("editorial.single-approver", `${path}.editorialApprovals`,
      "Approved by the owner alone. The two-person rule still applies before release."));
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
