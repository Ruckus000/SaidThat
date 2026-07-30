import { MODES } from "../domain/game.js";

export const FIXTURE_DISCLOSURE =
  "LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT";

export function headerScoreLabel({ score, concealScore }) {
  return concealScore ? "PRIVATE HANDOFF" : `ROOM · ${score}`;
}

// Game-layer reward copy. Celebrates skill at the game (reading the room),
// never a truth verdict — so it stays loud without color-coding authenticity.
export function resultHeadline(correct) {
  return correct ? "NAILED IT!" : "FOOLED YA.";
}

export function resultKicker(correct) {
  return correct ? "THE ROOM CALLED IT" : "THE ROOM GOT PLAYED";
}

export function resultRewardLabel(correct, streak) {
  if (!correct) return "Streak reset. The truth is one tap away.";
  if (streak >= 2) return `+100`;
  return "+100";
}

export function resultStreakLabel(streak) {
  if (streak < 2) return null;
  const sparks = "✦".repeat(Math.min(streak, 6));
  return `${sparks} ${streak} IN A ROW`;
}

// A non-color cue paired with the words, per the design DNA. Correct answers get
// a filled mark, misses a hollow one — meaning survives without color.
export function resultMark(correct) {
  return correct ? "◆" : "○";
}

export function streakBadgeLabel(streak) {
  return streak >= 2 ? `✦ STREAK ×${streak}` : null;
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
    { label: "BEST STREAK", value: `✦ ${bestStreak}` },
  ];
}

export function accuracyPercent(correctCount, roundsPlayed) {
  if (!roundsPlayed) return 0;
  return Math.round((correctCount / roundsPlayed) * 100);
}

// Positive, non-punishing run recap. It reports play, never a truth verdict,
// and is framed around the room's progress rather than individual blame.
export function runSummaryLabel({ roundsPlayed, correctCount, bestStreak, complete = false }) {
  if (!roundsPlayed) return null;
  const parts = [
    `${roundsPlayed} READS`,
    `${accuracyPercent(correctCount, roundsPlayed)}% CALLED`,
  ];
  if (bestStreak >= 2) parts.push(`BEST STREAK ${bestStreak}`);
  const prefix = complete ? "LAST RUN" : "THIS RUN";
  return `${prefix} · ${parts.join(" · ")}`;
}

export function continueLabel({ roundIndex, totalRounds }) {
  return roundIndex + 1 >= totalRounds ? "FINISH THE RUN" : "NEXT PROMPT";
}

export function setupSectionLabel(mode) {
  return mode === MODES.ROOM_BEACON ? "ACCESS ROLE" : "PRIVATE PLAY";
}

// Text state for a toggle, so on/off never relies on color alone.
export function toggleStateLabel(on) {
  return on ? "ON" : "OFF";
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
  if (card.contentState === "fixture-authentic" || card.authentic) {
    return 'SIMULATED AUTHENTIC · THEY “SAID” IT';
  }
  return "FABRICATED FOR THIS GAME";
}

export function reviewSourceStatus(card) {
  if (card.contentState === "fixture-authentic" || card.authentic) {
    return "development simulation — not a source-verified production card";
  }
  return "game fixture";
}

export function roundInstruction(mode) {
  return mode === MODES.ROOM_BEACON
    ? "The room argues. The holder taps once."
    : "Read privately. Answer once.";
}

export function roundModeLabel(mode, round, totalRounds) {
  if (typeof totalRounds === "number") {
    return `ROUND ${round} / ${totalRounds}`;
  }
  const ritual = mode === MODES.ROOM_BEACON ? "ROOM BEACON" : "PRIVATE RELAY";
  return `${ritual} · ROUND ${round}`;
}

export function roleCaption(accessRole) {
  return accessRole === "holder"
    ? "The prompt stays hidden from VoiceOver and TalkBack."
    : "You read the prompt aloud and argue with everyone else.";
}
