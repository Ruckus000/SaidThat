import { MODES } from "../domain/game.js";

export const FIXTURE_DISCLOSURE =
  "LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT";

export const MIXED_DECK_DISCLOSURE =
  "DEVELOPMENT BUILD · EDITORIAL CARDS PLUS LOCAL FIXTURES";

/**
 * What the deck on this device actually contains.
 *
 * This used to be driven by the __DEV__ flag alone, so a development build
 * asserted "NOT EDITORIAL CONTENT" even after the curated deck landed — by then
 * the overwhelming majority of playable cards WERE editorial, and the line was
 * simply false. A disclosure that misdescribes the deck is worse than none: it
 * is the same failure mode as a fixture reading as source-verified, pointed the
 * other way.
 *
 * Driven by the cards themselves so it cannot drift from them again.
 */
export function deckDisclosure(cards, { allowLocalFixtures = false } = {}) {
  if (!allowLocalFixtures) return null;
  const list = Array.isArray(cards) ? cards : [];
  const fixtures = list.filter((card) => card?.fixtureOnly === true).length;
  const editorial = list.length - fixtures;
  if (fixtures === 0) return null;
  if (editorial === 0) return FIXTURE_DISCLOSURE;
  return MIXED_DECK_DISCLOSURE;
}

export function headerScoreLabel(score) {
  return `ROOM · ${score}`;
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
  return `${streak} IN A ROW`;
}

// How many spark glyphs accompany a streak. The glyphs are drawn as SVG (THE MARK
// `spark`), never as text characters, so they render identically on every device.
export function streakSparkCount(streak) {
  return streak < 2 ? 0 : Math.min(streak, 6);
}

// The non-color cue paired with the reveal words, per the design DNA: a distinct
// MARK glyph per outcome, so meaning survives without color. This names the glyph
// rather than returning a character — the shape is drawn, not typed.
export function resultMarkName(correct) {
  return correct ? "close" : "struck";
}

export function streakBadgeLabel(streak) {
  return streak >= 2 ? `STREAK ×${streak}` : null;
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
    { label: "BEST STREAK", value: `${bestStreak}`, spark: true },
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

// When the device setting is what is holding reduced motion on, say so plainly
// rather than showing a toggle that appears stuck. The player is not being
// ignored — they are being obeyed, from a setting they made elsewhere.
export function reducedMotionHint(lockedByDevice) {
  return lockedByDevice
    ? "On because Reduce Motion is enabled in your device settings."
    : "Skip the suspense beat and flashes settle instantly.";
}

// Tilt calibration reads the accelerometer, which can be absent, denied, or
// wedged. The read is bounded, so "we asked and nothing came back" is a real
// outcome the player has to be told about — otherwise the button just stops
// working. Tap is always the complete route, so the unavailable copy says the
// game is unaffected rather than treating this as a failure.
export function calibrationHint({ calibrated, reading, unavailable }) {
  if (calibrated) return "Tilt is active for the holder. Tap answers still commit exactly once.";
  if (reading) return "Hold the phone level…";
  if (unavailable) {
    return "This device did not report motion, so tilt stays off. Tapping plays the full game.";
  }
  return "Hold the phone level, then calibrate before using tilt.";
}

// Extracted so the rendered text and the spoken announcement are literally the
// same value. Left inline in the JSX, the two copies drift the moment either is
// edited, and the app then tells sighted and non-sighted players different things.
export function reportStatusMessage(reportStatus) {
  if (reportStatus === "queued") {
    return "Saved locally. It stays queued until a reviewed delivery path exists.";
  }
  if (reportStatus === "failed") {
    return "Could not save the report. Your game can continue safely.";
  }
  return null;
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

// Stated only when a turn was actually discarded, so the shutter's standing
// reassurance does not have to carry the news of a specific loss. Names what
// happened and why, without blaming the player for an interruption.
export function privateDiscardNotice(discardedPriorTurn) {
  if (!discardedPriorTurn) return null;
  return "The last turn was interrupted, so it was discarded and will not be shown. Nothing was scored for it.";
}

export const PRIVATE_SHUTTER_RECOVERY =
  "The prior prompt and result are protected. If the app was interrupted, that private turn was discarded rather than shown to the next person.";

// The reset promises two things — clearing room progress and clearing queued
// reports. Progress lives in memory and always clears; the queue lives in device
// storage and can refuse. Stated only when the queue actually survived, so a
// clean reset stays silent rather than volunteering a failure that did not
// happen. Names where the reports are, since the player just asked to be rid of
// them and is owed the truth about which half of the promise was kept.
export function resetReportsNotice(reportsCleared) {
  if (reportsCleared) return null;
  return "Room progress was reset, but the reports queued on this device could not be cleared. They stay on this device and were not sent anywhere.";
}

// Truth labels are load-bearing: the words, not the color, carry the verdict.
// A simulated-authentic fixture and a source-verified editorial card are NOT the
// same claim, so they never share a label. The scare quotes on the fixture line
// are the tell — nobody actually said it. Keep the two branches distinct even
// while the deck is fixture-only; collapsing them would let a real editorial
// card ship under simulation copy the moment the pipeline lands.
export function reviewTruthLabel(card) {
  if (card.contentState === "fixture-authentic") {
    return 'SIMULATED AUTHENTIC · THEY “SAID” IT';
  }
  if (card.authentic) return "AUTHENTIC · THEY SAID IT";
  return "FABRICATED FOR THIS GAME";
}

// Reports where a claim actually comes from. The authentic branch used to read
// "editorial source record required" — copy written for a state that could not
// exist yet. Now that curated cards ship it must describe the record on the
// card, because that line is the only evidence a player is offered for a real
// claim about a real person.
//
// The host is shown rather than the full URL: it fits the review layout, it is
// the part that carries credibility, and a long archive URL would push the
// explanation off screen at large text sizes.
export function reviewSourceStatus(card) {
  if (card.contentState === "fixture-authentic") {
    return "development simulation — not a source-verified production card";
  }
  if (card.authentic) {
    const host = sourceHost(card.sourceRecord?.url);
    return host ? `verified source on file — ${host}` : "verified source on file";
  }
  if (card.contentState === "fabricated-for-game" && !card.fixtureOnly) {
    return "written for this game — no source, because nobody said it";
  }
  return "game fixture";
}

function sourceHost(url) {
  if (typeof url !== "string") return null;
  // Deliberately not `new URL()`: it throws on malformed input, and a bad URL
  // must degrade to a shorter line rather than crash the reveal.
  const match = url.match(/^https:\/\/([^/?#]+)/i);
  return match ? match[1].replace(/^www\./i, "") : null;
}

// Disclosed on reveal whenever a decoy was drafted with AI help. ADR-012 allows
// the assist only where a named human rewrote and owns the line, so the player
// is told the same thing the record says.
export function decoyDisclosure(card) {
  if (card?.decoyMethod !== "ai_assisted") return null;
  return "This decoy was drafted with AI assistance, then rewritten and approved by a human editor.";
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
