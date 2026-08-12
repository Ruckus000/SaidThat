import assert from "node:assert/strict";
import test from "node:test";

import {
  MODES,
  STAGES,
  cardForPresentation,
  canExposeCardToAssistiveTech,
  createSession,
  currentCard,
  canCommitAnswer,
  gameReducer,
  OWNER_APPROVAL,
  isPlayableCard,
  reportPayload,
  runLength,
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

// Display and scoring both key off authentic + contentState. Spreading
// authentic:true onto a fabricated-for-game fixture is no longer playable.
function authenticFixture(id) {
  return { ...fixture, id, authentic: true, contentState: "fixture-authentic" };
}

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
  // Display/score mismatch: contentState claims authentic, flag says fabricated.
  assert.equal(
    isPlayableCard({
      contentState: "authentic",
      authentic: false,
      sourceRecord: { retained: true, url: "https://example.com" },
      editorialApprovals: ["one", "two"],
    }),
    false,
  );
  assert.equal(
    isPlayableCard({ ...fixture, authentic: true }, { allowLocalFixtures: true }),
    false,
    "fabricated-for-game with authentic:true is not playable",
  );
  assert.equal(
    isPlayableCard({ ...fixture, authentic: false, contentState: "fixture-authentic" }, { allowLocalFixtures: true }),
    false,
    "fixture-authentic with authentic:false is not playable",
  );
});

// Pre-release owner approval, amended 2026-08-05. The two-person rule is still
// the release bar; before release there is one editor, and inventing a second
// name would make the rule look satisfied while providing none of the review it
// exists for. So a lone approval passes only when explicitly marked as the
// owner's — a distinct sentinel, not a name that could be matched by accident.
test("chaos: a lone approval passes only when it is the explicit owner marker", () => {
  const authentic = (editorialApprovals) => ({
    contentState: "authentic",
    authentic: true,
    sourceRecord: { retained: true, url: "https://example.com" },
    editorialApprovals,
  });

  assert.equal(isPlayableCard(authentic([OWNER_APPROVAL])), true);
  assert.equal(
    isPlayableCard({
      contentState: "fabricated-for-game",
      authentic: false,
      editorialApprovals: [OWNER_APPROVAL],
    }),
    true,
  );

  // Names that merely look owner-ish must not clear the bar.
  for (const impostor of ["owner", "Ruckus", "owner:", "OWNER:PRE-RELEASE"]) {
    assert.equal(isPlayableCard(authentic([impostor])), false, `${impostor} must not pass as the owner marker`);
  }
  // The string-iterable trap still closes: the marker must be an ARRAY entry.
  assert.equal(isPlayableCard(authentic(OWNER_APPROVAL)), false, "a bare string is not an approvals list");
  // Everything else about the card is still required.
  assert.equal(
    isPlayableCard({
      contentState: "authentic",
      authentic: true,
      sourceRecord: { retained: false },
      editorialApprovals: [OWNER_APPROVAL],
    }),
    false,
    "owner approval does not substitute for a retained source",
  );
});

// `new Set` takes any iterable, so a single approver written as a string counts
// its characters: new Set("alice").size is 5, which cleared the two-approval bar
// and shipped a one-approver card as if two people had signed it. Non-iterables
// threw out of createSession instead of reaching the content-unavailable screen.
// The deck is fixture-only today and fixtures never reach this check, so this
// guards the editorial pipeline that has not landed yet.
test("chaos: an approvals field that is not a list of approvals fails closed", () => {
  const productionAuthentic = (editorialApprovals) => ({
    contentState: "authentic",
    authentic: true,
    sourceRecord: { retained: true, url: "https://example.com" },
    editorialApprovals,
  });

  // A single approver as a bare string must never read as several approvals.
  assert.equal(isPlayableCard(productionAuthentic("alice")), false, "a string is not two approvals");
  assert.equal(isPlayableCard(productionAuthentic("ab")), false);
  // Non-iterables must fail closed rather than throwing out of the deck filter.
  for (const malformed of [5, {}, true, { 0: "a", 1: "b", length: 2 }]) {
    assert.doesNotThrow(() => isPlayableCard(productionAuthentic(malformed)));
    assert.equal(isPlayableCard(productionAuthentic(malformed)), false, `${JSON.stringify(malformed)} is not two approvals`);
  }
  // Absent and empty stay closed; a genuine pair still opens.
  assert.equal(isPlayableCard(productionAuthentic(undefined)), false);
  assert.equal(isPlayableCard(productionAuthentic([])), false);
  assert.equal(isPlayableCard(productionAuthentic(["alice", "bo"])), true, "two real approvers still pass");

  // A malformed card must not take the whole deck down with it.
  const session = createSession({ cards: [productionAuthentic(5)], deckVersion: "test" });
  assert.equal(session.stage, STAGES.CONTENT_UNAVAILABLE);
});

// SE4. The tilt path fires the commit haptic, and on the round screen that buzz
// IS the confirmation an answer landed — so it must fire only when the reducer
// will actually take the answer. Both the reducer and the tilt path ask this
// predicate, which is the point: one rule, not the same rule written twice.
//
// The first version of this test compared the predicate against the reducer and
// was worthless BECAUSE of that sharing — weakening the predicate weakened the
// reducer identically, so they agreed no matter what it said. These assertions
// are absolute: each state names the answer it must give.
test("chaos: the commit predicate names exactly when an answer can land", () => {
  const round = started();
  const answered = gameReducer(round, { type: "ANSWER", guessAuthentic: false });

  // The only state that may commit: a round whose answer is not yet in.
  assert.equal(canCommitAnswer(round), true, "a fresh round accepts an answer");

  // Everything else must refuse, and each for its own reason.
  assert.equal(canCommitAnswer(answered), false, "the round is already committed");
  assert.equal(
    canCommitAnswer(gameReducer(answered, { type: "OPEN_REVIEW" })),
    false,
    "the review is not a round",
  );
  assert.equal(
    canCommitAnswer(gameReducer(round, { type: "REQUEST_PAUSE" })),
    false,
    "a paused room cannot answer",
  );
  assert.equal(
    canCommitAnswer(gameReducer(round, { type: "GO_HOME" })),
    false,
    "home is not a round",
  );
  assert.equal(
    canCommitAnswer(gameReducer(round, { type: "APP_BACKGROUND" })),
    false,
    "an interrupted room cannot answer — the race the haptic used to lose",
  );

  // And the next round opens again, so this is a gate, not a one-shot.
  assert.equal(canCommitAnswer(gameReducer(answered, { type: "NEXT_ROUND" })), true);

  // Both halves of the predicate, asserted directly on constructed states.
  //
  // Reached this way on purpose: no action sequence produces stage=ROUND with the
  // round already committed — ANSWER moves to RESULT, and every route back to
  // ROUND clears committedRound — so a test driven only by actions cannot tell
  // the committedRound half from the stage half, and passes with either deleted.
  // Verified by mutation, not assumed. The guard stays because the predicate is
  // exported and its contract is "this round, not yet answered", independent of
  // which paths happen to reach it today.
  assert.equal(
    canCommitAnswer({ stage: STAGES.ROUND, roundIndex: 2, committedRound: 2 }),
    false,
    "a round already committed refuses, even sitting on ROUND",
  );
  assert.equal(
    canCommitAnswer({ stage: STAGES.ROUND, roundIndex: 2, committedRound: 1 }),
    true,
    "a commit from an earlier round does not block this one",
  );
  assert.equal(
    canCommitAnswer({ stage: STAGES.RESULT, roundIndex: 2, committedRound: null }),
    false,
    "an uncommitted round off the ROUND stage still refuses",
  );
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
  const cards = [0, 1, 2].map((n) => authenticFixture(`authentic-${n}`));
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
  const cards = [0, 1].map((n) => authenticFixture(`authentic-${n}`));
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
  const a1 = authenticFixture("a1");
  const a2 = authenticFixture("a2");
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

test("run: play again fails closed when the provided deck has nothing playable", () => {
  const a1 = authenticFixture("a1");
  let state = createSession({ cards: [a1], allowLocalFixtures: true, deckVersion: "test" });
  state = gameReducer(state, { type: "START_ROUND" });
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: true });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.equal(state.stage, STAGES.RECAP);

  // An empty deck cannot start a rematch.
  const empty = gameReducer(state, { type: "PLAY_AGAIN", cards: [], allowLocalFixtures: true });
  assert.equal(empty.stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(empty.fault, "no-safe-playable-content");

  // A deck of only withheld (non-playable) records also fails closed.
  const withheld = gameReducer(state, {
    type: "PLAY_AGAIN",
    cards: [{ ...fixture, id: "withheld-1", contentState: "disputed" }],
    allowLocalFixtures: true,
  });
  assert.equal(withheld.stage, STAGES.CONTENT_UNAVAILABLE);
  assert.equal(withheld.fault, "no-safe-playable-content");
});

test("run: private relay ends the final round in recap, not a shutter", () => {
  const a1 = authenticFixture("a1");
  const a2 = authenticFixture("a2");
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
  const a1 = authenticFixture("a1");
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
});

// PrivateShutterScreen tells the player their turn was thrown away based on this
// flag alone. It is set on an involuntary discard and cleared on reveal — but not
// on leaving or on starting a new run, so a flag that survived either would make
// the next handoff claim a loss that never happened. The words on that screen are
// only true if the flag belongs to the run in front of the player.
test("chaos: a discard notice belongs to its own run and never follows the player", () => {
  const interrupted = gameReducer(started(MODES.PRIVATE_RELAY), { type: "APP_BACKGROUND" });
  assert.equal(interrupted.privateRecovery, "discarded-prior-turn", "the discard is recorded");

  // Leaving mid-shutter drops it.
  const home = gameReducer(interrupted, { type: "GO_HOME" });
  assert.equal(home.privateRecovery, null, "leaving clears the discard");

  // And a fresh run cannot inherit one, whichever way the run begins.
  assert.equal(gameReducer(interrupted, { type: "START_ROUND" }).privateRecovery, null);
  assert.equal(
    gameReducer(interrupted, { type: "PLAY_AGAIN", cards: [fixture, secondFixture], allowLocalFixtures: true })
      .privateRecovery,
    null,
  );

  // The whole point: the next handoff in a new run must not claim a discard.
  const replayed = gameReducer(home, { type: "START_ROUND" });
  const handoff = gameReducer(gameReducer(replayed, { type: "ANSWER", guessAuthentic: false }), {
    type: "NEXT_ROUND",
  });
  assert.equal(handoff.stage, STAGES.PRIVATE_SHUTTER, "a normal handoff, not an interruption");
  assert.notEqual(handoff.privateRecovery, "discarded-prior-turn");

  // A real interruption still reports one, so this is not blanket suppression.
  assert.equal(
    gameReducer(replayed, { type: "APP_BACKGROUND" }).privateRecovery,
    "discarded-prior-turn",
  );
});

test("chaos: a screen-reader forehead holder cannot receive the prompt", () => {
  const holder = started();
  assert.equal(canExposeCardToAssistiveTech(holder), false);
  assert.equal(cardForPresentation(holder, { forAssistiveTech: true }), null);
  const contributor = gameReducer(holder, { type: "SET_ACCESS_ROLE", accessRole: "screen-facing" });
  assert.equal(canExposeCardToAssistiveTech(contributor), true);
});

// queueReport is async and the player can keep moving while it is in flight.
// Without a round scope the confirmation lands against whatever card is on screen
// when the write returns — telling the room a card was reported when nothing about
// that card was. The write is never suppressed, only the misattributed display.
test("chaos: a report confirmation cannot land against a later card", () => {
  let state = started();
  const reportedRound = state.roundIndex;

  // The player answers and moves on before the write settles.
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  state = gameReducer(state, { type: "NEXT_ROUND" });
  assert.notEqual(state.roundIndex, reportedRound, "the run really did advance");

  const late = gameReducer(state, { type: "REPORT_QUEUED", roundIndex: reportedRound });
  assert.equal(late.reportStatus, null, "a stale confirmation is dropped");
  assert.equal(late, state, "and the state is returned untouched, not rebuilt");

  const lateFailure = gameReducer(state, { type: "REPORT_FAILED", roundIndex: reportedRound });
  assert.equal(lateFailure.reportStatus, null);

  // The current round still reports normally — this is a scope, not a mute.
  assert.equal(
    gameReducer(state, { type: "REPORT_QUEUED", roundIndex: state.roundIndex }).reportStatus,
    "queued",
  );
  assert.equal(
    gameReducer(state, { type: "REPORT_FAILED", roundIndex: state.roundIndex }).reportStatus,
    "failed",
  );

  // An action with no roundIndex keeps the old behaviour rather than vanishing.
  assert.equal(gameReducer(state, { type: "REPORT_QUEUED" }).reportStatus, "queued");
});

// Rematch resets roundIndex to 0. A late REPORT_QUEUED from the previous run's
// round 0 would otherwise match the new run and show "Saved locally" on a card
// nobody reported in this run. runId is the scope that survives a rematch.
test("chaos: a report confirmation cannot land against a rematched run", () => {
  let state = started();
  const priorRunId = state.runId;
  const priorRound = state.roundIndex;
  assert.equal(priorRound, 0);

  state = gameReducer(state, { type: "PLAY_AGAIN", seed: 99, allowLocalFixtures: true });
  assert.equal(state.roundIndex, 0);
  assert.notEqual(state.runId, priorRunId);

  const late = gameReducer(state, {
    type: "REPORT_QUEUED",
    roundIndex: priorRound,
    runId: priorRunId,
  });
  assert.equal(late.reportStatus, null, "a prior-run confirmation is dropped");
  assert.equal(late, state, "and the state is returned untouched, not rebuilt");

  assert.equal(
    gameReducer(state, {
      type: "REPORT_QUEUED",
      roundIndex: state.roundIndex,
      runId: state.runId,
    }).reportStatus,
    "queued",
  );
});

test("chaos: report records minimize data and corrupted decks halt play", () => {
  let state = started();
  assert.deepEqual(reportPayload(state, "wrong-attribution", "2026-07-20T00:00:00.000Z"), {
    cardId: "fixture",
    reason: "wrong-attribution",
    deckVersion: "test",
    timestamp: "2026-07-20T00:00:00.000Z",
    runId: state.runId,
    roundIndex: state.roundIndex,
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
    const event = events[seed % events.length];
    state = gameReducer(state, event);
    assert.ok(Object.values(STAGES).includes(state.stage));
    if (state.stage === STAGES.PRIVATE_SHUTTER) assert.equal(cardForPresentation(state), null);
    // The storm used to pass while roundIndex ran past the end of the run: the
    // shutter's discard advanced it with no boundary, so currentCard wrapped
    // modulo the deck and re-served a card the room had already played. Stage
    // membership alone cannot see that — these bind the run arithmetic itself.
    assert.ok(
      state.roundIndex < runLength(state),
      `roundIndex ${state.roundIndex} ran past runLength ${runLength(state)} after ${event.type}`,
    );
    assert.ok(
      state.roundsPlayed <= runLength(state),
      `roundsPlayed ${state.roundsPlayed} exceeded runLength ${runLength(state)} after ${event.type}`,
    );
  }
});

test("private relay: an interruption on the final round ends the run instead of overflowing it", () => {
  // A notification or Control Center pull on the last card used to advance
  // roundIndex past the deck, producing "ROUND 8 / 7" and re-serving card 1.
  let state = started(MODES.PRIVATE_RELAY);
  const total = runLength(state);
  while (state.roundIndex < total - 1) {
    state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
    state = gameReducer(state, { type: "NEXT_ROUND" });
    if (state.stage === STAGES.PRIVATE_SHUTTER) {
      state = gameReducer(state, { type: "REVEAL_PRIVATE_TURN" });
    }
  }
  assert.equal(state.roundIndex, total - 1, "sanity: parked on the final round");

  const firstCard = currentCard(started(MODES.PRIVATE_RELAY));
  state = gameReducer(state, { type: "APP_BACKGROUND" });
  assert.equal(state.stage, STAGES.RECAP, "the run ends rather than handing off a turn that does not exist");
  assert.ok(state.roundIndex < total);
  assert.notEqual(currentCard(state)?.id, firstCard?.id ?? null, "no already-played card is re-served");
});

test("pause: the deliberate pause keeps the turn in both modes, unlike an interruption", () => {
  for (const mode of [MODES.ROOM_BEACON, MODES.PRIVATE_RELAY]) {
    const before = started(mode);
    const paused = gameReducer(before, { type: "REQUEST_PAUSE" });
    assert.equal(paused.stage, STAGES.PAUSED, `${mode} must reach PAUSED, where leaving is offered`);
    assert.equal(paused.roundIndex, before.roundIndex, `${mode} pause must not burn a card`);

    const resumed = gameReducer(paused, { type: "RESUME_ROOM" });
    assert.equal(resumed.roundIndex, before.roundIndex, `${mode} resume must not burn a card`);
    if (mode === MODES.PRIVATE_RELAY) {
      // The phone may have changed hands while paused, so the handoff ritual is
      // re-established before the protected turn is shown again.
      assert.equal(resumed.stage, STAGES.PRIVATE_SHUTTER);
      assert.equal(cardForPresentation(resumed), null);
      assert.equal(
        gameReducer(resumed, { type: "REVEAL_PRIVATE_TURN" }).stage,
        STAGES.ROUND,
        "and the same turn is still there behind it",
      );
    } else {
      assert.equal(resumed.stage, STAGES.ROUND);
    }
  }
});

test("pause: an interruption still fails closed, discarding the private turn", () => {
  const before = started(MODES.PRIVATE_RELAY);
  const interrupted = gameReducer(before, { type: "APP_BACKGROUND" });
  assert.equal(interrupted.stage, STAGES.PRIVATE_SHUTTER);
  assert.equal(interrupted.privateRecovery, "discarded-prior-turn");
  assert.notEqual(interrupted.roundIndex, before.roundIndex, "the interrupted turn is discarded, not resumed");
});

// After a scored answer, backgrounding must not claim "Nothing was scored".
test("chaos: private interrupt after a committed answer keeps the score and names the recovery", () => {
  let state = started(MODES.PRIVATE_RELAY);
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  assert.equal(state.stage, STAGES.RESULT);
  assert.equal(state.score, 100);
  assert.equal(state.roundsPlayed, 1);

  const interrupted = gameReducer(state, { type: "APP_BACKGROUND" });
  assert.equal(interrupted.stage, STAGES.PRIVATE_SHUTTER);
  assert.equal(interrupted.privateRecovery, "protected-after-commit");
  assert.equal(interrupted.score, 100, "points already earned stay");
  assert.equal(interrupted.roundsPlayed, 1);
});

test("chaos: private interrupt from review after a commit is protected-after-commit", () => {
  let state = started(MODES.PRIVATE_RELAY);
  state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
  state = gameReducer(state, { type: "OPEN_REVIEW" });
  const interrupted = gameReducer(state, { type: "APP_BACKGROUND" });
  assert.equal(interrupted.privateRecovery, "protected-after-commit");
  assert.equal(interrupted.score, state.score);
});

// Final-round unanswered discard ends the run without counting the blank card.
test("chaos: final-round unanswered private discard ends incomplete without inflating recap", () => {
  let state = started(MODES.PRIVATE_RELAY);
  const total = runLength(state);
  while (state.roundIndex < total - 1) {
    state = gameReducer(state, { type: "ANSWER", guessAuthentic: false });
    state = gameReducer(state, { type: "NEXT_ROUND" });
    if (state.stage === STAGES.PRIVATE_SHUTTER) {
      state = gameReducer(state, { type: "REVEAL_PRIVATE_TURN" });
    }
  }
  assert.equal(state.roundIndex, total - 1);
  assert.equal(state.roundsPlayed, total - 1);
  assert.equal(state.committedRound, null, "sanity: final card unanswered");

  state = gameReducer(state, { type: "APP_BACKGROUND" });
  assert.equal(state.stage, STAGES.RECAP);
  assert.equal(state.roundsPlayed, total - 1, "the unanswered final card is not a completed play");
  assert.ok(state.roundsPlayed < total, "Home must not claim a full completed run");
  // Callers slice recap by roundsPlayed — answered prefix only.
  assert.equal(state.cards.slice(0, state.roundsPlayed).length, state.roundsPlayed);
});
