import { isPlayableCard } from "../domain/game.js";

const FIXTURE_STATES = new Set([
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
  if (typeof record.contentState !== "string" || !FIXTURE_STATES.has(record.contentState)) return false;
  if (record.fixtureOnly === true && !record.id.startsWith("fixture-") && !record.id.startsWith("withheld-")) {
    return false;
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

export function playableFixtureDeck(catalog, options) {
  const { records } = validateDeck(catalog);
  return records.filter((record) => isPlayableCard(record, options));
}

export function rotateDeckIndex(roundIndex, deckLength) {
  if (!Number.isInteger(deckLength) || deckLength <= 0) return 0;
  const normalized = ((roundIndex % deckLength) + deckLength) % deckLength;
  return normalized;
}
