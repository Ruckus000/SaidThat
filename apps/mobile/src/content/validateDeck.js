import {
  CONTENT_STATES,
  isFixtureOnlyId,
  isHttpsUrl,
} from "../domain/contentRules.js";
import { isPlayableCard } from "../domain/game.js";

/**
 * Structural deck validation.
 *
 * Content-state vocabulary and https URL shape live in contentRules. Playability
 * (two-approver / owner approval, retained source) stays in isPlayableCard so
 * this module never re-owns those rules.
 */
export function validateDeckRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (typeof record.id !== "string" || record.id.length === 0) return false;
  if (typeof record.quote !== "string" || record.quote.length === 0) return false;
  if (typeof record.person !== "string" || record.person.length === 0) return false;
  if (typeof record.contentState !== "string" || !CONTENT_STATES.has(record.contentState)) return false;
  if (record.fixtureOnly === true && !isFixtureOnlyId(record.id)) {
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
    if (!isHttpsUrl(record.sourceRecord.url)) return false;
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
