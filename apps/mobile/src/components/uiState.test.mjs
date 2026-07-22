import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_UNAVAILABLE_GUARD,
  FIXTURE_DISCLOSURE,
  PRIVATE_SHUTTER_RECOVERY,
  accuracyPercent,
  contentUnavailableMessage,
  headerScoreLabel,
  resultHeadline,
  resultMark,
  resultRewardLabel,
  recapStatLines,
  reviewSourceStatus,
  reviewTruthLabel,
  roundInstruction,
  roundModeLabel,
  runRankLabel,
  runSummaryLabel,
  setupSectionLabel,
  setupShowsAccessRoles,
  streakBadgeLabel,
} from "./presentationLabels.js";
import {
  MODES,
  STAGES,
  createSession,
  gameReducer,
  shouldConcealScore,
} from "../domain/game.js";

const fixture = {
  id: "fixture",
  quote: "Fabricated fixture",
  person: "Test person",
  authentic: false,
  contentState: "fabricated-for-game",
  fixtureOnly: true,
};

function privateShutterState() {
  // Two cards so the first NEXT_ROUND is a non-final handoff (shutter), not the recap.
  const cards = [fixture, { ...fixture, id: "fixture-2" }];
  let state = createSession({ cards, allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "SET_MODE", mode: MODES.PRIVATE_RELAY });
  state = gameReducer(state, { type: "START_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.PRIVATE_SHUTTER);
  return state;
}

test("ui: fixture disclosure copy is explicit and development-only", () => {
  assert.match(FIXTURE_DISCLOSURE, /LOCAL DEVELOPMENT FIXTURES/);
  assert.match(FIXTURE_DISCLOSURE, /NOT EDITORIAL CONTENT/);
});

test("ui: setup role labels follow Room Beacon vs Private Relay", () => {
  assert.equal(setupSectionLabel(MODES.ROOM_BEACON), "ACCESS ROLE");
  assert.equal(setupSectionLabel(MODES.PRIVATE_RELAY), "PRIVATE PLAY");
  assert.equal(setupShowsAccessRoles(MODES.ROOM_BEACON), true);
  assert.equal(setupShowsAccessRoles(MODES.PRIVATE_RELAY), false);
});

test("ui: round labels name the ritual and holder instruction", () => {
  assert.equal(roundModeLabel(MODES.ROOM_BEACON, 2), "ROOM BEACON · ROUND 2");
  assert.equal(roundModeLabel(MODES.PRIVATE_RELAY, 1), "PRIVATE RELAY · ROUND 1");
  assert.match(roundInstruction(MODES.ROOM_BEACON), /holder taps exactly one answer/i);
  assert.match(roundInstruction(MODES.PRIVATE_RELAY), /Read privately/i);
});

test("ui: review truth labels stay textual, not color-only", () => {
  assert.equal(
    reviewTruthLabel({ authentic: false, contentState: "fabricated-for-game" }),
    "FABRICATED FOR THIS GAME",
  );
  assert.equal(
    reviewTruthLabel({ authentic: true, contentState: "fixture-authentic" }),
    "SIMULATED AUTHENTIC FIXTURE",
  );
  assert.match(
    reviewSourceStatus({ authentic: true, contentState: "fixture-authentic" }),
    /not a source-verified production card/i,
  );
});

test("reward: result copy celebrates skill with a non-color cue and never punishes a miss", () => {
  assert.equal(resultHeadline(true), "NAILED IT");
  assert.equal(resultHeadline(false), "NOT THIS TIME");
  // Filled vs hollow mark carries meaning without relying on color.
  assert.notEqual(resultMark(true), resultMark(false));
  assert.equal(resultRewardLabel(true, 1), "+100 to the room");
  assert.equal(resultRewardLabel(true, 3), "+100 · 3 IN A ROW");
  // A miss reward line is forward-looking, not blaming.
  assert.match(resultRewardLabel(false, 0), /next one/i);
  assert.equal(streakBadgeLabel(1), null);
  assert.match(streakBadgeLabel(4), /4 STREAK/);
});

test("reward: run summary reports play positively without truth verdicts", () => {
  assert.equal(accuracyPercent(3, 4), 75);
  assert.equal(accuracyPercent(0, 0), 0);
  assert.equal(runSummaryLabel({ roundsPlayed: 0, correctCount: 0, bestStreak: 0 }), null);
  assert.match(
    runSummaryLabel({ roundsPlayed: 4, correctCount: 3, bestStreak: 3 }),
    /THIS RUN · 4 reads · 75% called · best streak 3/,
  );
  // Does not append a streak brag when there was none.
  assert.equal(
    runSummaryLabel({ roundsPlayed: 2, correctCount: 1, bestStreak: 1 }),
    "THIS RUN · 2 reads · 50% called",
  );
});

test("reward: recap rank rates room skill without punishing a rough run", () => {
  assert.equal(runRankLabel(100), "ROOM ORACLE");
  assert.equal(runRankLabel(90), "ROOM ORACLE");
  assert.equal(runRankLabel(75), "SHARP EYES");
  assert.equal(runRankLabel(50), "SPLIT ROOM");
  assert.equal(runRankLabel(0), "WARMING UP");

  const lines = recapStatLines({ score: 200, correctCount: 5, roundsPlayed: 7, bestStreak: 3 });
  assert.deepEqual(
    lines.map((line) => line.label),
    ["SCORE", "CALLED RIGHT", "ACCURACY", "BEST STREAK"],
  );
  const byLabel = Object.fromEntries(lines.map((line) => [line.label, line.value]));
  assert.equal(byLabel.SCORE, "200");
  assert.equal(byLabel["CALLED RIGHT"], "5 of 7");
  assert.equal(byLabel.ACCURACY, "71%");
  assert.equal(byLabel["BEST STREAK"], "3");
});

test("ui: private shutter conceals score through reducer and header copy", () => {
  const state = privateShutterState();
  assert.equal(shouldConcealScore(state), true);
  assert.equal(headerScoreLabel({ score: state.score, concealScore: true }), "PRIVATE HANDOFF");
  assert.equal(headerScoreLabel({ score: state.score, concealScore: false }), `ROOM SCORE · ${state.score}`);
  assert.match(PRIVATE_SHUTTER_RECOVERY, /discarded rather than shown to the next person/i);
});

test("ui: unavailable content recovery explains blocked play", () => {
  assert.equal(contentUnavailableMessage("corrupt-deck"), "The deck failed an integrity check.");
  assert.equal(
    contentUnavailableMessage("no-safe-playable-content"),
    "No reviewed, playable content is available on this device.",
  );
  assert.match(CONTENT_UNAVAILABLE_GUARD, /never used as binary game prompts/i);

  const emptySession = createSession({ cards: [], deckVersion: "test" });
  assert.equal(emptySession.stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(contentUnavailableMessage(emptySession.fault), contentUnavailableMessage("no-safe-playable-content"));

  let state = createSession({ cards: [fixture], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "SIMULATE_CORRUPT_DECK" });
  assert.equal(state.stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(contentUnavailableMessage(state.fault), contentUnavailableMessage("corrupt-deck"));
});
