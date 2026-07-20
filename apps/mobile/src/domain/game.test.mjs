import assert from "node:assert/strict";
import test from "node:test";

import {
  MODES,
  STAGES,
  cardForPresentation,
  canExposeCardToAssistiveTech,
  createSession,
  gameReducer,
  isPlayableCard,
  reportPayload,
  shouldConcealScore,
} from "./game.js";

const fixture = {
  id: "fixture",
  quote: "Fabricated fixture",
  person: "Test person",
  authentic: false,
  contentState: "fabricated-for-game",
  fixtureOnly: true,
};

function started(mode = MODES.ROOM_BEACON) {
  let state = createSession({ cards: [fixture], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "SET_MODE", mode });
  return gameReducer(state, { type: "START_ROUND" });
}

test("chaos: unapproved, disputed, removed, and malformed authentic records fail closed", () => {
  assert.equal(isPlayableCard({ contentState: "authentic", sourceRecord: { retained: true, url: "https://example.com" }, editorialApprovals: ["one"] }), false);
  assert.equal(isPlayableCard({ ...fixture, contentState: "removed" }, { allowLocalFixtures: true }), false);
  assert.equal(isPlayableCard({ ...fixture, contentState: "disputed" }, { allowLocalFixtures: true }), false);
  assert.equal(createSession({ cards: [{ contentState: "authentic" }], deckVersion: "test" }).stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(createSession({ cards: null, deckVersion: "test" }).stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(isPlayableCard({ ...fixture, authentic: true, contentState: "fixture-authentic" }), false);
  assert.equal(isPlayableCard({ ...fixture, authentic: true, contentState: "fixture-authentic" }, { allowLocalFixtures: true }), true);
});

test("chaos: duplicate taps score only once", () => {
  const state = started();
  const first = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  const duplicate = gameReducer(first, { type: "ANSWER", guessAuthentic: false });
  assert.equal(first.score, 100);
  assert.deepEqual(duplicate, first);
});

test("chaos: private relay never shows prior card or result during handoff", () => {
  let state = started(MODES.PRIVATE_RELAY);
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  state = gameReducer(state, { type: "OPEN_REVIEW" });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.PRIVATE_SHUTTER);
  assert.equal(state.roundIndex, 1);
  assert.equal(cardForPresentation(state), null);
  assert.equal(shouldConcealScore(state), true);
  assert.equal(canExposeCardToAssistiveTech(state), true);
  state = gameReducer(state, { type: "REVEAL_PRIVATE_TURN" });
  assert.equal(state.stage, STAGES.ROUND);
});

test("chaos: backgrounding private content enters a shutter, not a spoiler state", () => {
  const state = gameReducer(started(MODES.PRIVATE_RELAY), { type: "APP_BACKGROUND" });
  assert.equal(state.stage, STAGES.PRIVATE_SHUTTER);
  assert.equal(state.resumeStage, STAGES.ROUND);
  assert.equal(state.roundIndex, 1);
  assert.equal(state.privateRecovery, "discarded-prior-turn");
  assert.equal(cardForPresentation(state), null);
  assert.equal(shouldConcealScore(state), true);
});

test("chaos: a screen-reader forehead holder cannot receive the prompt", () => {
  const holder = started();
  assert.equal(canExposeCardToAssistiveTech(holder), false);
  assert.equal(cardForPresentation(holder, { forAssistiveTech: true }), null);
  const contributor = gameReducer(holder, { type: "SET_ACCESS_ROLE", accessRole: "screen-facing" });
  assert.equal(canExposeCardToAssistiveTech(contributor), true);
});

test("chaos: report records minimize data and corrupted decks halt play", () => {
  let state = started();
  assert.deepEqual(reportPayload(state, "wrong-attribution", "2026-07-20T00:00:00.000Z"), {
    cardId: "fixture",
    reason: "wrong-attribution",
    deckVersion: "test",
    timestamp: "2026-07-20T00:00:00.000Z",
  });
  state = gameReducer(state, { type: "SIMULATE_CORRUPT_DECK" });
  assert.equal(state.stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(state.fault, "corrupt-deck");
});

test("chaos: malformed report reasons are reduced to a safe category", () => {
  assert.equal(reportPayload(started(), "<script>alert(1)</script>", "2026-07-20T00:00:00.000Z").reason, "other");
});

test("chaos: arbitrary event storms do not create invalid stages or duplicate commits", () => {
  const events = [
    { type: "ANSWER", guessAuthentic: false },
    { type: "OPEN_REVIEW" },
    { type: "NEXT_ROUND" },
    { type: "APP_BACKGROUND" },
    { type: "REVEAL_PRIVATE_TURN" },
    { type: "GO_HOME" },
    { type: "START_ROUND" },
  ];
  let state = started(MODES.PRIVATE_RELAY);
  let seed = 73;
  for (let step = 0; step < 500; step += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    state = gameReducer(state, events[seed % events.length]);
    assert.ok(Object.values(STAGES).includes(state.stage));
    if (state.stage === STAGES.PRIVATE_SHUTTER) assert.equal(cardForPresentation(state), null);
  }
});
