import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIRM_BAND,
  MAX_TRACKED_CARDS,
  PLAYTEST_SCHEMA,
  cardVerdict,
  derivedStats,
  emptyStats,
  isCalibratableCardId,
  pruneStats,
  recordGroup,
  recordLaugh,
  recordOutcome,
  toExport,
  wilsonInterval,
} from "./playtestPolicy.js";
import { createPlaytestStore, PLAYTEST_KEY } from "../storage/playtestStore.js";

function entry(overrides = {}) {
  return { answered: 0, correct: 0, skips: 0, laughs: 0, groups: 0, ...overrides };
}

test("wilson: the interval stays inside [0,1] and narrows as evidence grows", () => {
  const [lo, hi] = wilsonInterval(4, 12);
  assert.ok(lo >= 0 && hi <= 1);
  // At n=12 the interval is wide enough that 4/12 triggers nothing — which is
  // the entire defence against retiring a good card on a small sample.
  assert.ok(hi - lo > 0.4, `expected a wide interval at n=12, got ${hi - lo}`);

  const [lo2, hi2] = wilsonInterval(40, 120);
  assert.ok(hi2 - lo2 < hi - lo, "more evidence must narrow the interval");
  assert.equal(wilsonInterval(0, 0)[0], 0);
  assert.equal(wilsonInterval(0, 0)[1], 1);
});

test("verdict: nothing is decided below the evidence floor", () => {
  assert.equal(cardVerdict(entry({ answered: 11, correct: 6, groups: 9 })), "insufficient-data");
  assert.equal(cardVerdict(entry({ answered: 20, correct: 10, groups: 3 })), "insufficient-data");
  // 4/12 across 4 groups looks bad but the interval is far too wide to act on.
  assert.equal(cardVerdict(entry({ answered: 12, correct: 4, groups: 4 })), "keep");
});

test("verdict: a card that splits the room is confirmed", () => {
  const verdict = cardVerdict(entry({ answered: 40, correct: 22, groups: 10 }));
  assert.equal(verdict, "confirm");
  const { interval } = derivedStats(entry({ answered: 40, correct: 22, groups: 10 }));
  assert.ok(interval[0] >= CONFIRM_BAND[0] && interval[1] <= CONFIRM_BAND[1]);
});

test("verdict: an obvious or arbitrary card goes to watch, not the bin", () => {
  // Everyone gets it right — a dead round.
  assert.equal(cardVerdict(entry({ answered: 20, correct: 20, groups: 6 })), "watch");
  // Almost nobody gets it right — arbitrary or mis-keyed.
  assert.equal(cardVerdict(entry({ answered: 20, correct: 1, groups: 6 })), "watch");
});

test("verdict: retirement needs a large sample across many groups", () => {
  // Unanimous, but only 20 exposures: watch, not retire.
  assert.equal(cardVerdict(entry({ answered: 20, correct: 20, groups: 6 })), "watch");
  // Same rate, enough evidence.
  assert.equal(cardVerdict(entry({ answered: 45, correct: 45, groups: 14 })), "retire");
  // Enough exposures but too few groups — one unusual room is not a verdict.
  assert.equal(cardVerdict(entry({ answered: 45, correct: 45, groups: 5 })), "watch");
});

test("verdict: a heavy skip rate retires a card", () => {
  assert.equal(cardVerdict(entry({ answered: 25, correct: 13, skips: 10, groups: 8 })), "retire");
});

test("verdict: a report overrides every statistic, at n=1", () => {
  assert.equal(cardVerdict(entry({ answered: 40, correct: 22, groups: 10 }), { reported: true }), "retire");
  assert.equal(cardVerdict(entry(), { reported: true }), "retire");
});

test("stats: a skip is not an answer", () => {
  let stats = emptyStats();
  stats = recordOutcome(stats, { cardId: "a", correct: true });
  stats = recordOutcome(stats, { cardId: "a", correct: false, skipped: true });
  const card = stats.cards.a;
  assert.equal(card.answered, 1, "a skip must not drag the correct-rate toward zero");
  assert.equal(card.correct, 1);
  assert.equal(card.skips, 1);

  const derived = derivedStats(card);
  assert.equal(derived.correctRate, 1);
  assert.equal(derived.exposures, 2);
  assert.equal(derived.skipRate, 0.5);
});

test("stats: split quality peaks at a 50/50 card", () => {
  assert.equal(derivedStats(entry({ answered: 10, correct: 5 })).splitQuality, 1);
  assert.equal(derivedStats(entry({ answered: 10, correct: 10 })).splitQuality, 0);
  assert.equal(derivedStats(entry({ answered: 10, correct: 0 })).splitQuality, 0);
});

test("stats: laugh share is per group, not per exposure", () => {
  let stats = emptyStats();
  stats = recordGroup(stats, ["a", "a", "b"]);
  stats = recordGroup(stats, ["a"]);
  stats = recordLaugh(stats, { cardId: "a" });
  assert.equal(stats.cards.a.groups, 2, "a card seen twice in one run is still one group");
  assert.equal(derivedStats(stats.cards.a).laughShare, 0.5);
});

test("stats: tracking is bounded", () => {
  let stats = emptyStats();
  for (let i = 0; i < MAX_TRACKED_CARDS + 25; i += 1) {
    stats = recordOutcome(stats, { cardId: `card-${i}`, correct: true });
  }
  assert.equal(Object.keys(stats.cards).length, MAX_TRACKED_CARDS);
  // Existing entries keep accumulating once the cap is hit.
  stats = recordOutcome(stats, { cardId: "card-0", correct: false });
  assert.equal(stats.cards["card-0"].answered, 2);
});

test("stats: a missing card id is ignored rather than creating an entry", () => {
  const stats = recordOutcome(emptyStats(), { cardId: undefined, correct: true });
  assert.deepEqual(stats.cards, {});
});

test("export: the payload carries aggregates and no identity of any kind", () => {
  let stats = emptyStats();
  stats = recordGroup(stats, ["a"]);
  stats = recordOutcome(stats, { cardId: "a", correct: true });
  stats = recordLaugh(stats, { cardId: "a" });

  const payload = toExport(stats, "1.2.3");
  assert.equal(payload.schema, PLAYTEST_SCHEMA);
  assert.equal(payload.deckVersion, "1.2.3");
  // Asserted as an exact key set: this is the one structure that leaves the
  // device, so a field added by accident must fail the test rather than ship.
  assert.deepEqual(Object.keys(payload).sort(), ["cards", "deckVersion", "schema"]);
  assert.deepEqual(
    Object.keys(payload.cards[0]).sort(),
    ["answered", "cardId", "correct", "groups", "laughs", "skips"],
  );
  const serialised = JSON.stringify(payload);
  for (const word of ["player", "name", "device", "timestamp", "roundIndex", "at"]) {
    assert.ok(!serialised.includes(`"${word}"`), `export must not contain a ${word} field`);
  }
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => {
      value = next;
    },
    removeItem: async () => {
      value = null;
    },
  };
}

test("store: a round trip preserves the aggregates", async () => {
  const store = createPlaytestStore(memoryStorage());
  await store.updateStats((stats) => recordOutcome(stats, { cardId: "a", correct: true }));
  const loaded = await store.loadStats();
  assert.equal(loaded.cards.a.correct, 1);
});

test("store: malformed or non-object payloads start a fresh sample", async () => {
  for (const stored of ["{not json", "[]", '{"cards":null}', '"a string"']) {
    const store = createPlaytestStore(memoryStorage(stored));
    assert.deepEqual((await store.loadStats()).cards, {}, stored);
  }
});

test("store: a refusing backend loses the sample without throwing", async () => {
  const wedged = {
    getItem: async () => {
      throw new Error("bridge unavailable");
    },
    setItem: async () => {
      throw new Error("bridge unavailable");
    },
    removeItem: async () => {
      throw new Error("bridge unavailable");
    },
  };
  const store = createPlaytestStore(wedged);
  assert.deepEqual((await store.loadStats()).cards, {});
  assert.equal(await store.saveStats(emptyStats()), false);
  assert.equal(await store.clearStats(), false);
});

test("store: the key is versioned", () => {
  assert.match(PLAYTEST_KEY, /:v\d+$/);
});

/**
 * Fixture contamination. Local fixtures are inert in a release build, but the
 * stats outlive the build — a release-config export from a simulator that had
 * earlier run a dev build carried real fixture ids next to real cards.
 */
test("playtest: fixture and withheld ids are never recorded", () => {
  let stats = emptyStats();
  for (const cardId of ["fixture-ember-07", "withheld-03"]) {
    stats = recordOutcome(stats, { cardId, correct: true });
    stats = recordLaugh(stats, { cardId });
    stats = recordGroup(stats, [cardId]);
  }
  assert.deepEqual(stats.cards, {}, "no recorder may admit a fixture id");

  // A real card in the same run is still recorded — the guard is per-id, not
  // per-run, or one fixture would discard the whole sample.
  stats = recordGroup(stats, ["fixture-ember-07", "b2000000-0000-4000-8000-000000000027"]);
  assert.deepEqual(Object.keys(stats.cards), ["b2000000-0000-4000-8000-000000000027"]);
});

test("playtest: isCalibratableCardId rejects only the reserved prefixes", () => {
  assert.equal(isCalibratableCardId("b2000000-0000-4000-8000-000000000027"), true);
  assert.equal(isCalibratableCardId("fixture-ember-07"), false);
  assert.equal(isCalibratableCardId("withheld-03"), false);
  // Not a prefix match, so it stays eligible.
  assert.equal(isCalibratableCardId("card-fixture-01"), true);
  for (const bad of ["", null, undefined, 7, {}]) {
    assert.equal(isCalibratableCardId(bad), false, String(bad));
  }
});

test("playtest: pruning drops fixture entries and keeps the object when clean", () => {
  const clean = { cards: { a: entry({ answered: 1 }) } };
  assert.equal(pruneStats(clean), clean, "an untouched sample must not be rebuilt");

  const dirty = {
    cards: { a: entry({ answered: 1 }), "fixture-ember-07": entry({ answered: 9 }) },
  };
  assert.deepEqual(Object.keys(pruneStats(dirty).cards), ["a"]);
  assert.equal(pruneStats(dirty).cards.a.answered, 1, "real counts survive untouched");
  assert.deepEqual(pruneStats(null).cards, {});
});

// The migration path: a device that collected fixture data under a dev build
// heals on load, without asking the player to reset.
test("store: a sample collected under a dev build is cleaned on load", async () => {
  const seeded = JSON.stringify({
    cards: {
      "b2000000-0000-4000-8000-000000000027": entry({ answered: 2, correct: 1, groups: 1 }),
      "fixture-ember-07": entry({ answered: 1, correct: 1, groups: 1 }),
      "fixture-sage-03": entry({ answered: 1, groups: 1 }),
    },
  });
  const storage = memoryStorage(seeded);
  const store = createPlaytestStore(storage);

  const loaded = await store.loadStats();
  assert.deepEqual(Object.keys(loaded.cards), ["b2000000-0000-4000-8000-000000000027"]);

  // And the cleaned set is what gets written back, so the fixtures are gone for
  // good rather than filtered on every read.
  await store.updateStats((stats) => stats);
  const persisted = JSON.parse(await storage.getItem(PLAYTEST_KEY));
  assert.deepEqual(Object.keys(persisted.cards), ["b2000000-0000-4000-8000-000000000027"]);

  // The export is therefore clean too — this is the file an editor receives.
  const payload = toExport(await store.loadStats(), "0.3.0");
  assert.ok(!JSON.stringify(payload).includes("fixture-"));
});
