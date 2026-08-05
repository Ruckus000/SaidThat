import assert from "node:assert/strict";
import test from "node:test";

import { catalog } from "./catalog.js";
import {
  applyTombstones,
  playableDeck,
  playableFixtureDeck,
  rotateDeckIndex,
  validateDeck,
  validateDeckRecord,
} from "./validateDeck.js";

test("deck: bundled catalog passes structural validation", () => {
  const result = validateDeck(catalog);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("deck: playable fixture deck excludes withheld editorial states", () => {
  const playable = playableFixtureDeck(catalog, { allowLocalFixtures: true });
  assert.ok(playable.length >= 4);
  assert.ok(playable.every((record) => record.fixtureOnly === true));
  assert.ok(playable.every((record) => !["disputed", "removed", "source-unavailable"].includes(record.contentState)));
});

test("deck: rotation is deterministic across rematches", () => {
  const length = playableFixtureDeck(catalog, { allowLocalFixtures: true }).length;
  assert.equal(rotateDeckIndex(0, length), 0);
  assert.equal(rotateDeckIndex(length, length), 0);
  assert.equal(rotateDeckIndex(length + 2, length), 2);
});

test("deck: malformed records fail validation", () => {
  assert.equal(validateDeckRecord(null), false);
  assert.equal(validateDeckRecord({ id: "x", quote: "", person: "y", contentState: "fabricated-for-game" }), false);
  // Still rejected, but now because a curated card must carry an explanation and
  // a retained https source — not because "authentic" was an unknown state.
  assert.equal(validateDeckRecord({ id: "fixture-bad", quote: "q", person: "p", contentState: "authentic" }), false);
});

const curatedRecord = {
  id: "card-1",
  quote: "is meatball an fruit",
  person: "A Public Figure",
  authentic: true,
  contentState: "authentic",
  explanation: "Posted in 2018 and widely recirculated.",
  sourceRecord: { retained: true, url: "https://example.invalid/archive" },
  editorialApprovals: ["ed-a", "ed-b"],
};

test("deck: a well-formed curated authentic record validates", () => {
  // Regression: "authentic" was missing from the accepted state set, so every
  // real card was dropped before isPlayableCard could evaluate it and the deck
  // silently played as fabricated-only.
  assert.equal(validateDeckRecord(curatedRecord), true);
  assert.equal(validateDeck([curatedRecord]).valid, true);
});

test("deck: a curated record survives validation and is playable end to end", () => {
  const playable = playableDeck([curatedRecord], { allowLocalFixtures: false });
  assert.deepEqual(playable.map((record) => record.id), ["card-1"]);
});

test("deck: a curated record without a retained https source is rejected", () => {
  for (const sourceRecord of [
    undefined,
    { retained: true, url: "http://example.invalid/archive" },
    { retained: true },
  ]) {
    assert.equal(validateDeckRecord({ ...curatedRecord, sourceRecord }), false, JSON.stringify(sourceRecord));
  }
});

test("deck: a curated record without an explanation or approvals array is rejected", () => {
  assert.equal(validateDeckRecord({ ...curatedRecord, explanation: "" }), false);
  assert.equal(validateDeckRecord({ ...curatedRecord, editorialApprovals: "ed-a" }), false);
});

test("deck: a fixture may not claim the authentic state", () => {
  assert.equal(validateDeckRecord({ ...curatedRecord, id: "fixture-x", fixtureOnly: true }), false);
});

test("deck: tombstoned ids are dropped whatever the record says", () => {
  assert.deepEqual(applyTombstones([{ id: "a" }, { id: "b" }], ["b"]).map((r) => r.id), ["a"]);
  assert.deepEqual(applyTombstones([{ id: "a" }], null).map((r) => r.id), ["a"]);
  assert.deepEqual(applyTombstones(null, ["a"]), []);
  assert.deepEqual(playableDeck([curatedRecord], { allowLocalFixtures: false }, ["card-1"]), []);
});
