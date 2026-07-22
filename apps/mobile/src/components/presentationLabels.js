import { MODES } from "../domain/game.js";

export const FIXTURE_DISCLOSURE =
  "LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT";

export function headerScoreLabel({ score, concealScore }) {
  return concealScore ? "PRIVATE HANDOFF" : `ROOM SCORE · ${score}`;
}

// Game-layer reward copy. This celebrates skill at the game (reading the room),
// never a truth verdict, so it stays warm without color-coding authenticity.
export function resultHeadline(correct) {
  return correct ? "NAILED IT" : "NOT THIS TIME";
}

export function resultRewardLabel(correct, streak) {
  if (!correct) return "The room reads the next one.";
  if (streak >= 2) return `+100 · ${streak} IN A ROW`;
  return "+100 to the room";
}

// A non-color cue paired with the words, per the design DNA. Correct answers get
// a filled mark, misses a hollow one — meaning survives without color.
export function resultMark(correct) {
  return correct ? "◆" : "○";
}

export function streakBadgeLabel(streak) {
  return streak >= 2 ? `🔥 ${streak} STREAK` : null;
}

// Playful recap rank for how well the room read the run. It rates game skill
// (accuracy), never a person and never a truth verdict, and stays encouraging at
// the low end so a rough run is never a punishment.
export function runRankLabel(accuracy) {
  if (accuracy >= 90) return "ROOM ORACLE";
  if (accuracy >= 70) return "SHARP EYES";
  if (accuracy >= 50) return "SPLIT ROOM";
  return "WARMING UP";
}

export function recapStatLines({ score, correctCount, roundsPlayed, bestStreak }) {
  return [
    { label: "SCORE", value: `${score}` },
    { label: "CALLED RIGHT", value: `${correctCount} of ${roundsPlayed}` },
    { label: "ACCURACY", value: `${accuracyPercent(correctCount, roundsPlayed)}%` },
    { label: "BEST STREAK", value: `${bestStreak}` },
  ];
}

export function accuracyPercent(correctCount, roundsPlayed) {
  if (!roundsPlayed) return 0;
  return Math.round((correctCount / roundsPlayed) * 100);
}

// Positive, non-punishing run recap. It reports play, never a truth verdict,
// and is framed around the room's progress rather than individual blame.
export function runSummaryLabel({ roundsPlayed, correctCount, bestStreak }) {
  if (!roundsPlayed) return null;
  const reads = roundsPlayed === 1 ? "1 read" : `${roundsPlayed} reads`;
  const parts = [reads, `${accuracyPercent(correctCount, roundsPlayed)}% called`];
  if (bestStreak >= 2) parts.push(`best streak ${bestStreak}`);
  return `THIS RUN · ${parts.join(" · ")}`;
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
