import { MODES } from "../domain/game.js";

export const FIXTURE_DISCLOSURE =
  "LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT";

export function headerScoreLabel({ score, concealScore }) {
  return concealScore ? "PRIVATE HANDOFF" : `ROOM SCORE · ${score}`;
}

export function setupSectionLabel(mode) {
  return mode === MODES.ROOM_BEACON ? "ACCESS ROLE" : "PRIVATE PLAY";
}

export function setupShowsAccessRoles(mode) {
  return mode === MODES.ROOM_BEACON;
}

export function contentUnavailableMessage(fault) {
  return fault === "corrupt-deck"
    ? "The deck failed an integrity check."
    : "No reviewed, playable content is available on this device.";
}

export const CONTENT_UNAVAILABLE_GUARD =
  "Disputed, removed, and source-unavailable records are never used as binary game prompts.";

export const PRIVATE_SHUTTER_RECOVERY =
  "The prior prompt and result are protected. If the app was interrupted, that private turn was discarded rather than shown to the next person.";

export function reviewTruthLabel(card) {
  if (card.contentState === "fixture-authentic") return "SIMULATED AUTHENTIC FIXTURE";
  if (card.authentic) return "AUTHENTIC";
  return "FABRICATED FOR THIS GAME";
}

export function reviewSourceStatus(card) {
  if (card.contentState === "fixture-authentic") {
    return "development simulation — not a source-verified production card";
  }
  if (card.authentic) return "editorial source record required";
  return "game fixture";
}

export function roundInstruction(mode) {
  return mode === MODES.ROOM_BEACON
    ? "The group decides. The holder taps exactly one answer."
    : "Read privately, then make exactly one answer.";
}

export function roundModeLabel(mode, round) {
  const ritual = mode === MODES.ROOM_BEACON ? "ROOM BEACON" : "PRIVATE RELAY";
  return `${ritual} · ROUND ${round}`;
}
