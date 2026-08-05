import { isPlayableCard } from "../domain/game.js";

/**
 * Every content state a deck record may declare.
 *
 * "authentic" belongs here even though no bundled fixture uses it. Its absence
 * was a silent data-loss bug: `isPlayableCard` requires exactly that state for a
 * curated public-figure card, so a correctly-built editorial record was rejected
 * by validateDeckRecord before isPlayableCard ever saw it. The deck then played
 * as fabricated-only with no error surfaced — a failure that looks completely
 * normal on screen, which is why it needs a test rather than a glance.
 *
 * Formerly FIXTURE_STATES; the old name stopped being true once real cards
 * could ship.
 */
const CONTENT_STATES = new Set([
  "authentic",
  "fabricated-for-game",
  "fixture-authentic",
  "disputed",
  "source-unavailable",
  "removed",
]);

export function validateDeckRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (typeof record.id !== "string" || record.id.length === 0) return false;
  if (typeof record.quote !== "string" || record.quote.length === 0) return false;
  if (typeof record.person !== "string" || record.person.length === 0) return false;
  if (typeof record.contentState !== "string" || !CONTENT_STATES.has(record.contentState)) return false;
  if (record.fixtureOnly === true && !record.id.startsWith("fixture-") && !record.id.startsWith("withheld-")) {
    return false;
  }

  // Structural requirements for a curated card. Deliberately structural only:
  // isPlayableCard remains the single owner of the two-distinct-approvals rule,
  // and duplicating that logic here would let the two drift apart and disagree
  // about what is playable.
  if (record.contentState === "authentic") {
    if (record.fixtureOnly === true) return false;
    if (typeof record.explanation !== "string" || record.explanation.length === 0) return false;
    if (!record.sourceRecord || typeof record.sourceRecord !== "object") return false;
    if (typeof record.sourceRecord.url !== "string" || !record.sourceRecord.url.startsWith("https://")) return false;
    if (!Array.isArray(record.editorialApprovals)) return false;
  }

  return true;
}

export function validateDeck(catalog) {
  if (!Array.isArray(catalog)) return { valid: false, records: [], errors: ["catalog-not-array"] };
  const errors = [];
  const records = [];
  for (const record of catalog) {
    if (!validateDeckRecord(record)) errors.push(`invalid-record:${record?.id ?? "unknown"}`);
    else records.push(record);
  }
  return { valid: errors.length === 0, records, errors };
}

/**
 * Removal precedence: a tombstoned id is dropped whatever the record says.
 *
 * Tombstones exist so a takedown can propagate faster than a full deck rebuild,
 * so they must win over cached content rather than being merged with it.
 */
export function applyTombstones(records, tombstoneIds) {
  if (!Array.isArray(records)) return [];
  const removed = new Set(Array.isArray(tombstoneIds) ? tombstoneIds : []);
  return records.filter((record) => !removed.has(record?.id));
}

export function playableDeck(catalog, options, tombstoneIds) {
  const { records } = validateDeck(catalog);
  return applyTombstones(records, tombstoneIds).filter((record) => isPlayableCard(record, options));
}

/**
 * Retained for one release so callers migrate in a separate change from the
 * behaviour fix above.
 */
export const playableFixtureDeck = playableDeck;

export function rotateDeckIndex(roundIndex, deckLength) {
  if (!Number.isInteger(deckLength) || deckLength <= 0) return 0;
  const normalized = ((roundIndex % deckLength) + deckLength) % deckLength;
  return normalized;
}
