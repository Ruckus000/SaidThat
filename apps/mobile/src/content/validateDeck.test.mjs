import assert from "node:assert/strict";
import test from "node:test";

import { catalog } from "./catalog.js";
import {
  applyTombstones,
  playableDeck,
  validateDeck,
  validateDeckRecord,
} from "./validateDeck.js";

test("deck: bundled catalog passes structural validation", () => {
  const result = validateDeck(catalog);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("deck: playable deck excludes withheld editorial states", () => {
  const playable = playableDeck(catalog, { allowLocalFixtures: true });
  assert.ok(playable.length >= 4);
  assert.ok(playable.every((record) => !["disputed", "removed", "source-unavailable"].includes(record.contentState)));
});

// The catalog now merges curated cards with the dev fixtures, so the two
// configurations must differ: fixtures are development-only, and the curated
// deck is what a release actually plays. Asserted together because the failure
// mode runs both ways — fixtures leaking into release, or curated cards being
// filtered out of it (which is what the missing "authentic" content state used
// to do, silently).
test("deck: fixtures are development-only and curated cards ship in release", () => {
  const dev = playableDeck(catalog, { allowLocalFixtures: true });
  const release = playableDeck(catalog, { allowLocalFixtures: false });

  assert.ok(release.length > 0, "a release build must have playable content");
  assert.ok(release.every((record) => record.fixtureOnly !== true), "no fixture may ship in release");
  assert.ok(dev.some((record) => record.fixtureOnly === true), "fixtures must remain available in development");
  assert.ok(dev.length > release.length, "the dev deck is the release deck plus fixtures");

  // Every card a release plays is either source-verified or labelled fabricated.
  for (const record of release) {
    assert.ok(["authentic", "fabricated-for-game"].includes(record.contentState), record.id);
    if (record.contentState === "authentic") {
      assert.equal(record.sourceRecord?.retained, true, record.id);
    }
  }
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

test("deck: fixtureOnly ids must use the shared fixture prefixes", () => {
  assert.equal(
    validateDeckRecord({
      id: "card-not-a-fixture",
      quote: "q",
      person: "p",
      authentic: false,
      contentState: "fabricated-for-game",
      fixtureOnly: true,
    }),
    false,
  );
});

test("deck: authentic flag must match contentState", () => {
  assert.equal(validateDeckRecord({ ...curatedRecord, authentic: false }), false);
  assert.equal(
    validateDeckRecord({
      id: "fixture-sim",
      quote: "q",
      person: "p",
      authentic: false,
      contentState: "fixture-authentic",
      fixtureOnly: true,
    }),
    false,
  );
  assert.equal(
    validateDeckRecord({
      id: "fixture-fab",
      quote: "q",
      person: "p",
      authentic: true,
      contentState: "fabricated-for-game",
      fixtureOnly: true,
    }),
    false,
  );
});

test("deck: tombstoned ids are dropped whatever the record says", () => {
  assert.deepEqual(applyTombstones([{ id: "a" }, { id: "b" }], ["b"]).map((r) => r.id), ["a"]);
  assert.deepEqual(applyTombstones([{ id: "a" }], null).map((r) => r.id), ["a"]);
  assert.deepEqual(applyTombstones(null, ["a"]), []);
  assert.deepEqual(playableDeck([curatedRecord], { allowLocalFixtures: false }, ["card-1"]), []);
});
