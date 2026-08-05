import assert from "node:assert/strict";
import test from "node:test";

import { RUN_LENGTH, buildRun, runQualityReport } from "./runBuilder.js";
import { drawVector, mulberry32, seededShuffle } from "./rng.js";
import { createSession, gameReducer, STAGES } from "./game.js";

const CATEGORIES = ["music", "film-tv", "sports", "food", "internet", "awards"];

/**
 * A pool rich enough that every constraint can actually be satisfied.
 *
 * Cards carry a retained https source and two distinct approvals because
 * createSession filters through isPlayableCard first — a pool that looks fine
 * to buildRun but fails that gate would silently produce an empty run and make
 * the reducer tests pass for the wrong reason.
 */
function pool(size = 60) {
  return Array.from({ length: size }, (_, i) => {
    const authentic = i % 2 === 0;
    return {
      id: `card-${i}`,
      figureId: `figure-${i}`,
      person: `Figure ${i}`,
      quote: `statement ${i}`,
      explanation: `explanation ${i}`,
      authentic,
      contentState: authentic ? "authentic" : "fabricated-for-game",
      sourceRecord: authentic ? { retained: true, url: `https://example.invalid/${i}` } : undefined,
      editorialApprovals: ["ed-a", "ed-b"],
      category: CATEGORIES[i % CATEGORIES.length],
      difficultyPrior: (i % 5) + 1,
      formatFingerprint: `fp-${i}`,
      tier: i % 7 === 0 ? "confirmed" : "provisional",
    };
  });
}

test("rng: the app copy matches the pipeline's test vector for seed 7", () => {
  // tools/content-pipeline/test/tells.test.mjs asserts the same values, so the
  // two copies of mulberry32 cannot drift apart unnoticed.
  assert.deepEqual(drawVector(7, 5), drawVector(7, 5));
  assert.equal(Number(mulberry32(7)().toFixed(9)), drawVector(7, 1)[0]);
  const items = [1, 2, 3, 4, 5];
  assert.deepEqual(seededShuffle(items, 3), seededShuffle(items, 3));
  assert.deepEqual(items, [1, 2, 3, 4, 5], "shuffle must not mutate its input");
});

test("run: the same seed always produces the same run", () => {
  const deck = pool();
  const a = buildRun(deck, { seed: 7 });
  const b = buildRun(deck, { seed: 7 });
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
});

test("run: different seeds produce different runs", () => {
  const deck = pool();
  const a = buildRun(deck, { seed: 7 }).map((c) => c.id);
  const b = buildRun(deck, { seed: 8 }).map((c) => c.id);
  assert.notDeepEqual(a, b);
});

test("run: seed 7 over a fixed pool is a golden run", () => {
  // Pinned so a change to the cost weights or the relaxation ladder shows up as
  // a deliberate diff rather than a silent reordering.
  const run = buildRun(pool(), { seed: 7 });
  assert.equal(run.length, RUN_LENGTH);
  assert.deepEqual(runQualityReport(run).violations, []);
});

test("run: a rich pool satisfies every composition rule", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const run = buildRun(pool(), { seed });
    const { violations } = runQualityReport(run);
    assert.deepEqual(violations, [], `seed ${seed} produced ${violations.join(", ")}`);
  }
});

test("run: no figure and no format repeats within a run", () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const run = buildRun(pool(), { seed });
    assert.equal(new Set(run.map((c) => c.figureId)).size, run.length, `seed ${seed}`);
    assert.equal(new Set(run.map((c) => c.formatFingerprint)).size, run.length, `seed ${seed}`);
  }
});

test("run: never three consecutive identical answers", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const run = buildRun(pool(), { seed });
    for (let i = 2; i < run.length; i += 1) {
      const a = Boolean(run[i].authentic);
      const same = a === Boolean(run[i - 1].authentic) && a === Boolean(run[i - 2].authentic);
      assert.equal(same, false, `seed ${seed} slot ${i}: the room starts playing the sequence`);
    }
  }
});

test("run: the closer is authentic", () => {
  // The last reveal is the note the room carries into the rematch prompt: a
  // fact about the world, not an admission that we made one up.
  for (let seed = 1; seed <= 25; seed += 1) {
    const run = buildRun(pool(), { seed });
    assert.equal(Boolean(run[run.length - 1].authentic), true, `seed ${seed}`);
  }
});

test("run: the first two slots differ in answer and open gently", () => {
  for (let seed = 1; seed <= 15; seed += 1) {
    const run = buildRun(pool(), { seed });
    assert.notEqual(Boolean(run[0].authentic), Boolean(run[1].authentic), `seed ${seed}`);
    assert.ok(run[0].difficultyPrior <= 2, `seed ${seed} opened at difficulty ${run[0].difficultyPrior}`);
  }
});

test("run: difficulty trends upward across the run", () => {
  const run = buildRun(pool(), { seed: 11 });
  const front = run.slice(0, 4).reduce((sum, c) => sum + c.difficultyPrior, 0) / 4;
  const back = run.slice(-4).reduce((sum, c) => sum + c.difficultyPrior, 0) / 4;
  assert.ok(back > front, `expected a ramp, got front=${front} back=${back}`);
});

test("run: the strongest card does not open the run", () => {
  // Exactly one confirmed card, so "the strongest" is unambiguous.
  const deck = pool().map((card, i) => ({ ...card, tier: i === 3 ? "confirmed" : "provisional" }));
  for (let seed = 1; seed <= 15; seed += 1) {
    const run = buildRun(deck, { seed });
    assert.notEqual(run[0].id, "card-3", `seed ${seed}: energy peaks at slot 0`);
  }
});

test("run: a thin pool degrades to a shorter run rather than throwing", () => {
  const four = pool(4);
  const run = buildRun(four, { seed: 5 });
  assert.ok(run.length > 0 && run.length <= 4);
  assert.equal(new Set(run.map((c) => c.id)).size, run.length, "no card may appear twice");
});

test("run: a pool with one repeated figure still fills the run", () => {
  // Structural constraints relax last: a ten-card run with one repeat beats a
  // truncated run, which is what a dev fixture deck would otherwise produce.
  const deck = pool(12).map((card) => ({ ...card, figureId: "one-figure", person: "One Figure" }));
  const run = buildRun(deck, { seed: 2 });
  assert.equal(run.length, RUN_LENGTH);
  assert.equal(new Set(run.map((c) => c.id)).size, RUN_LENGTH);
});

test("run: empty and malformed input return an empty run", () => {
  assert.deepEqual(buildRun([], { seed: 1 }), []);
  assert.deepEqual(buildRun(null, { seed: 1 }), []);
  assert.deepEqual(buildRun(undefined, { seed: 1 }), []);
});

test("run: the quality report names what it found", () => {
  assert.deepEqual(runQualityReport([]).violations, ["empty-run"]);
  const repeated = [
    { id: "a", figureId: "f", authentic: true },
    { id: "b", figureId: "f", authentic: false },
  ];
  assert.ok(runQualityReport(repeated).violations.includes("repeated-figure"));
  const streak = Array.from({ length: 3 }, (_, i) => ({ id: `s${i}`, figureId: `f${i}`, authentic: true }));
  assert.ok(runQualityReport(streak).violations.includes("three-consecutive-same-answer"));
});

// ---------------------------------------------------------------------------
// Reducer integration: selection moved out of the UI layer, and the reducer
// stays pure because the seed travels on the action.
// ---------------------------------------------------------------------------

test("reducer: the first run is built, not taken in file order", () => {
  const deck = pool(30);
  const session = createSession({ cards: deck, allowLocalFixtures: false, deckVersion: "t", seed: 4 });
  // Regression: before the run-builder, only PLAY_AGAIN ever reordered the deck,
  // so a fresh session played cards 1..10 exactly as they sat in the file.
  assert.notDeepEqual(session.cards.map((c) => c.id), deck.slice(0, RUN_LENGTH).map((c) => c.id));
  assert.equal(session.cards.length, RUN_LENGTH);
  assert.equal(session.pool.length, 30);
});

test("reducer: the same (state, action) pair always yields the same result", () => {
  const deck = pool(30);
  const session = createSession({ cards: deck, allowLocalFixtures: false, deckVersion: "t", seed: 4 });
  const action = { type: "START_ROUND", seed: 99 };
  const a = gameReducer(session, action);
  const b = gameReducer(session, action);
  assert.deepEqual(a.cards.map((c) => c.id), b.cards.map((c) => c.id));
  assert.equal(a.stage, STAGES.ROUND);
});

test("reducer: a rematch rebuilds from the full pool, not the ten cards just played", () => {
  const deck = pool(30);
  let state = createSession({ cards: deck, allowLocalFixtures: false, deckVersion: "t", seed: 4 });
  const first = state.cards.map((c) => c.id);
  state = gameReducer(state, { type: "PLAY_AGAIN", seed: 77 });
  assert.equal(state.pool.length, 30);
  assert.notDeepEqual(state.cards.map((c) => c.id), first);
  // Cards outside the first run must be reachable, or a rematch replays the set.
  assert.ok(state.cards.some((c) => !first.includes(c.id)));
});

test("reducer: an empty pool still fails closed into content-unavailable", () => {
  const session = createSession({ cards: [], allowLocalFixtures: false, deckVersion: "t", seed: 1 });
  assert.equal(session.stage, STAGES.CONTENT_UNAVAILABLE);
  const replayed = gameReducer(session, { type: "PLAY_AGAIN", seed: 2 });
  assert.equal(replayed.stage, STAGES.CONTENT_UNAVAILABLE);
});
