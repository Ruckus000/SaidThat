import assert from "node:assert/strict";
import test from "node:test";

import { loadDeck, loadFigures } from "../lib/deck.mjs";
import { validateAll } from "../lib/validate.mjs";

/**
 * Golden state of the ported candidate corpus.
 *
 * The 40 cards in docs/content/phase0-deck.candidates.json were ported honestly
 * — no provenance was invented to make them pass — so they FAIL the gates. This
 * file pins exactly how, for two reasons:
 *
 *   1. A gate that passes on a corpus this raw would be inert. Asserting the
 *      specific failures proves each rule is actually wired up and firing.
 *   2. It stops the failures being "fixed" by weakening a rule. Changing a
 *      threshold to make the corpus pass breaks this test loudly.
 *
 * When the editorial pass (CP-04) cleans the corpus, these counts go to zero
 * and the assertions invert. Update the numbers here in the same commit that
 * changes the cards — never separately.
 */

const EXPECTED_BLOCKING = {
  // S2 — 16 of 20 authentic cards cite one listicle; all 20 are Tier C.
  "provenance.tier-c": 20,
  "provenance.independent-citations": 20,
  "schema.source-not-retained": 20,
  // S9 — read-aloud failures.
  "read-aloud.hashtag": 1,
  "read-aloud.mention": 2,
  "read-aloud.too-long": 1,
  "read-aloud.unpronounceable": 1,
  // S10 — safety defects.
  "safety.sexual": 1,
  "safety.sensitivity-containment": 1,
  "safety.third-party-named": 5,
};

test("corpus: the ported candidates fail the gates exactly as recorded", async () => {
  const { manifest, cards } = await loadDeck("pop-voices");
  const { byId } = await loadFigures();
  const outcome = validateAll({ manifest, cards, figures: byId });

  assert.equal(cards.length, 40);
  assert.equal(outcome.ok, false, "a raw research corpus must not pass the gates");

  const counts = new Map();
  for (const entry of outcome.issues.filter((e) => e.level === "block")) {
    counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  }

  assert.deepEqual(
    Object.fromEntries([...counts].sort()),
    Object.fromEntries(Object.entries(EXPECTED_BLOCKING).sort()),
  );
});

test("corpus: every card carries the fields the emitter will need", async () => {
  const { cards } = await loadDeck("pop-voices");
  for (const card of cards) {
    assert.ok(card.id, "id");
    assert.ok(card.figureId, `figureId on ${card.id}`);
    assert.equal(typeof card.statementText, "string");
    assert.ok(["authentic", "fabricated"].includes(card.authenticity), `authenticity on ${card.id}`);
    assert.ok(card.explanation.length > 0, `explanation on ${card.id}`);
    assert.equal(card.removalStatus, "active");
    // difficultyPrior, never a flat `difficulty` — see editorial-rubric.md §5.4.
    assert.equal(card.difficulty, undefined, `stale difficulty field on ${card.id}`);
    assert.ok(Number.isInteger(card.difficultyPrior), `difficultyPrior on ${card.id}`);
  }
});

test("corpus: figures resolve one-to-one and none is pre-approved", async () => {
  const { cards } = await loadDeck("pop-voices");
  const { byId } = await loadFigures();
  for (const card of cards) {
    assert.ok(byId.has(card.figureId), `unresolved figure on ${card.id}`);
    assert.equal(byId.get(card.figureId).displayName, card.displayName);
    // The port must not manufacture editorial approvals.
    assert.deepEqual(card.editorialApprovals, [], `unexpected approvals on ${card.id}`);
    assert.equal(card.status, "draft");
  }
});
