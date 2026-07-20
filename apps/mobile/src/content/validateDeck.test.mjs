import assert from "node:assert/strict";
import test from "node:test";

import { catalog } from "./catalog.js";
import { playableFixtureDeck, rotateDeckIndex, validateDeck, validateDeckRecord } from "./validateDeck.js";

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
  assert.equal(validateDeckRecord({ id: "fixture-bad", quote: "q", person: "p", contentState: "authentic" }), false);
});
