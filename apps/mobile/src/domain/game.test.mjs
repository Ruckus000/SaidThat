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
import { MAX_QUEUED_REPORTS, appendQueuedReport } from "./reportPolicy.js";

const fixture = {
  id: "fixture",
  quote: "Fabricated fixture",
  person: "Test person",
  authentic: false,
  contentState: "fabricated-for-game",
  fixtureOnly: true,
};

// Two cards so a NEXT_ROUND from the first round is a non-final round (exercises
// the Private Relay handoff shutter rather than ending the run).
const secondFixture = { ...fixture, id: "fixture-2" };

function started(mode = MODES.ROOM_BEACON) {
  let state = createSession({ cards: [fixture, secondFixture], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "SET_MODE", mode });
  return gameReducer(state, { type: "START_ROUND" });
}

test("chaos: unapproved, disputed, removed, and malformed authentic records fail closed", () => {
  assert.equal(isPlayableCard({ contentState: "authentic", sourceRecord: { retained: true, url: "https://example.com" }, editorialApprovals: ["one"] }), false);
  assert.equal(isPlayableCard({ ...fixture, contentState: "removed" }, { allowLocalFixtures: true }), false);
  assert.equal(isPlayableCard({ ...fixture, contentState: "disputed" }, { allowLocalFixtures: true }), false);
  assert.equal(createSession({ cards: [{ contentState: "authentic" }], deckVersion: "test" }).stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(createSession({ cards: null, deckVersion: "test" }).stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(isPlayableCard({ contentState: "fabricated-for-game", editorialApprovals: ["same", "same"] }), false);
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

test("reward: streak counts consecutive correct reads and resets on a miss", () => {
  // Three distinct cards so the run spans three rounds before any recap.
  const cards = [0, 1, 2].map((n) => ({ ...fixture, id: `authentic-${n}`, authentic: true }));
  let state = createSession({ cards, allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "START_ROUND" });

  // Correct guess raises the streak and best streak.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 1);
  assert.equal(state.score, 100);

  // A duplicate tap cannot inflate the streak.
  const duplicate = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  assert.equal(duplicate.streak, 1);

  // Second correct read continues the streak.
  state = gameReducer(state, { type: "NEXT_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  assert.equal(state.streak, 2);
  assert.equal(state.bestStreak, 2);

  // A miss resets the current streak but preserves the best.
  state = gameReducer(state, { type: "NEXT_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  assert.equal(state.streak, 0);
  assert.equal(state.bestStreak, 2);
  assert.equal(state.lastCorrect, false);
});

test("reward: run stats count plays and correct reads without double counting", () => {
  const cards = [0, 1].map((n) => ({ ...fixture, id: `authentic-${n}`, authentic: true }));
  let state = createSession({ cards, allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "START_ROUND" });

  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  // A duplicate tap must not inflate the run totals.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  assert.equal(state.roundsPlayed, 1);
  assert.equal(state.correctCount, 1);

  state = gameReducer(state, { type: "NEXT_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  assert.equal(state.roundsPlayed, 2);
  assert.equal(state.correctCount, 1);
});

test("reward: reset clears the streak alongside the score", () => {
  let state = started();
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  assert.equal(state.streak, 1);
  state = gameReducer(state, {
    type: "RESET_LOCAL_SESSION",
    cards: [fixture],
    allowLocalFixtures: true,
    deckVersion: "test",
  });
  assert.equal(state.streak, 0);
  assert.equal(state.bestStreak, 0);
});

test("run: a full pass through the deck ends in recap, and play again resets the run", () => {
  const a1 = { ...fixture, id: "a1", authentic: true };
  const a2 = { ...fixture, id: "a2", authentic: true };
  let state = createSession({ cards: [a1, a2], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "START_ROUND" });

  // Round 1 of 2 -> not the end, back to a round.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.ROUND);
  assert.equal(state.roundIndex, 1);

  // Round 2 of 2 -> end of run -> recap. No card is exposed on recap.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.RECAP);
  assert.equal(state.roundsPlayed, 2);
  assert.equal(state.correctCount, 2);
  assert.equal(state.score, 200);
  assert.equal(cardForPresentation(state), null);

  // Play again starts a fresh run with the shuffled deck; score resets to 0.
  state = gameReducer(state, { type: "PLAY_AGAIN", cards: [a2, a1], allowLocalFixtures: true });
  assert.equal(state.stage, STAGES.ROUND);
  assert.equal(state.roundIndex, 0);
  assert.equal(state.score, 0);
  assert.equal(state.roundsPlayed, 0);
  assert.equal(state.streak, 0);
});

test("run: private relay ends the final round in recap, not a shutter", () => {
  const a1 = { ...fixture, id: "a1", authentic: true };
  const a2 = { ...fixture, id: "a2", authentic: true };
  let state = createSession({ cards: [a1, a2], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "SET_MODE", mode: MODES.PRIVATE_RELAY });
  state = gameReducer(state, { type: "START_ROUND" });

  // Non-final round still protects the handoff with a shutter.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.PRIVATE_SHUTTER);
  state = gameReducer(state, { type: "REVEAL_PRIVATE_TURN" });
  assert.equal(state.stage, STAGES.ROUND);

  // Final round goes straight to recap (recap holds no private card).
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.RECAP);
  assert.equal(cardForPresentation(state), null);
});

test("run: starting again after a completed run resets instead of re-looping the last card", () => {
  const a1 = { ...fixture, id: "a1", authentic: true };
  let state = createSession({ cards: [a1], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "START_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.RECAP);

  // A single-card run is complete after one round; START_ROUND must reset it.
  state = gameReducer(state, { type: "START_ROUND" });
  assert.equal(state.stage, STAGES.ROUND);
  assert.equal(state.roundIndex, 0);
  assert.equal(state.score, 0);
  assert.equal(state.roundsPlayed, 0);
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

test("chaos: report floods retain only the bounded, most recent queue", () => {
  const queue = Array.from({ length: MAX_QUEUED_REPORTS + 10 }, (_, index) => ({ cardId: String(index) }))
    .reduce((records, report) => appendQueuedReport(records, report), []);
  assert.equal(queue.length, MAX_QUEUED_REPORTS);
  assert.equal(queue[0].cardId, "10");
  assert.equal(queue.at(-1).cardId, String(MAX_QUEUED_REPORTS + 9));
});

test("chaos: reset local session returns to a fresh home state", () => {
  let state = started();
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  assert.equal(state.score, 100);
  state = gameReducer(state, {
    type: "RESET_LOCAL_SESSION",
    cards: [fixture],
    allowLocalFixtures: true,
    deckVersion: "test",
  });
  assert.equal(state.stage, STAGES.HOME);
  assert.equal(state.score, 0);
  assert.equal(state.roundIndex, 0);
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
