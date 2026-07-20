import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_UNAVAILABLE_GUARD,
  FIXTURE_DISCLOSURE,
  PRIVATE_SHUTTER_RECOVERY,
  contentUnavailableMessage,
  headerScoreLabel,
  reviewSourceStatus,
  reviewTruthLabel,
  roundInstruction,
  roundModeLabel,
  setupSectionLabel,
  setupShowsAccessRoles,
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
  let state = createSession({ cards: [fixture], allowLocalFixtures: true, deckVersion: "test" });
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
