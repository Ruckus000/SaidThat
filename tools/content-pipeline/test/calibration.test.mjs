import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  PLAYTEST_SCHEMA,
  mergeExports,
  proposeTransitions,
  verdictFor,
  wilsonInterval,
} from "../lib/calibration.mjs";

const APP_POLICY = fileURLToPath(
  new URL("../../../apps/mobile/src/domain/playtestPolicy.js", import.meta.url),
);

function exportPayload(cards) {
  return { schema: PLAYTEST_SCHEMA, deckVersion: "1.0.0", cards };
}

test("calibration: exports from several devices sum per card", () => {
  const totals = mergeExports([
    exportPayload([{ cardId: "a", answered: 10, correct: 6, skips: 1, laughs: 2, groups: 2 }]),
    exportPayload([
      { cardId: "a", answered: 5, correct: 2, skips: 0, laughs: 1, groups: 1 },
      { cardId: "b", answered: 3, correct: 3, skips: 0, laughs: 0, groups: 1 },
    ]),
  ]);
  assert.deepEqual(totals.get("a"), { answered: 15, correct: 8, skips: 1, laughs: 3, groups: 3 });
  assert.equal(totals.get("b").answered, 3);
});

test("calibration: an unknown schema is rejected rather than silently merged", () => {
  assert.throws(() => mergeExports([{ schema: "something-else", cards: [] }]), /Unrecognised playtest schema/);
  assert.throws(() => mergeExports([{ cards: [] }]), /missing/);
});

test("calibration: only real status changes are proposed", () => {
  const cards = [
    { id: "a", displayName: "A", status: "provisional" },
    { id: "b", displayName: "B", status: "confirmed" },
    { id: "c", displayName: "C", status: "provisional" },
  ];
  const totals = mergeExports([
    exportPayload([
      // Splits the room across enough groups: promote.
      { cardId: "a", answered: 40, correct: 22, skips: 0, laughs: 8, groups: 10 },
      // Same evidence, but already confirmed — no change to propose.
      { cardId: "b", answered: 40, correct: 22, skips: 0, laughs: 8, groups: 10 },
      // Too little evidence to say anything.
      { cardId: "c", answered: 4, correct: 2, skips: 0, laughs: 0, groups: 1 },
    ]),
  ]);

  const proposals = proposeTransitions(cards, totals);
  assert.deepEqual(proposals.map((p) => [p.cardId, p.from, p.to]), [["a", "provisional", "confirmed"]]);
  assert.equal(proposals[0].groups, 10);
  assert.ok(proposals[0].laughShare > 0);
});

test("calibration: a card with no data is left alone", () => {
  const proposals = proposeTransitions([{ id: "z", displayName: "Z", status: "provisional" }], new Map());
  assert.deepEqual(proposals, []);
});

test("calibration: a confirmed card is not downgraded on a thin later sample", () => {
  // Drift detection needs a trailing window, which the export deliberately does
  // not carry — so this path must do nothing rather than guess.
  const totals = mergeExports([
    exportPayload([{ cardId: "a", answered: 15, correct: 15, skips: 0, laughs: 0, groups: 5 }]),
  ]);
  const proposals = proposeTransitions([{ id: "a", displayName: "A", status: "confirmed" }], totals);
  assert.deepEqual(proposals, []);
});

test("calibration: a unanimous card with enough evidence is retired", () => {
  const totals = mergeExports([
    exportPayload([{ cardId: "a", answered: 45, correct: 45, skips: 0, laughs: 0, groups: 14 }]),
  ]);
  const proposals = proposeTransitions([{ id: "a", displayName: "A", status: "provisional" }], totals);
  assert.deepEqual(proposals.map((p) => p.to), ["retired"]);
});

// ---------------------------------------------------------------------------
// The app and the pipeline each own a copy of these thresholds — the app must
// not import build tooling, and the tooling must not import the app bundle.
// This is what stops the two copies drifting apart.
// ---------------------------------------------------------------------------
test("calibration: the pipeline's thresholds match the app's", async () => {
  const source = await readFile(APP_POLICY, "utf8");
  const constants = {
    MIN_EXPOSURES: 12,
    MIN_GROUPS: 4,
    CONFIRM_EXPOSURES: 25,
    CONFIRM_GROUPS: 8,
    MIN_RETIRE_EXPOSURES: 40,
    MIN_RETIRE_GROUPS: 12,
    MAX_SKIP_RATE: 0.1,
    RETIRE_SKIP_RATE: 0.2,
  };
  for (const [name, value] of Object.entries(constants)) {
    const match = source.match(new RegExp(`export const ${name} = ([\\d.]+);`));
    assert.ok(match, `${name} missing from playtestPolicy.js`);
    assert.equal(Number(match[1]), value, `${name} disagrees between the app and the pipeline`);
  }
  for (const [name, band] of Object.entries({
    CONFIRM_BAND: "[0.3, 0.8]",
    WATCH_BAND: "[0.25, 0.85]",
    RETIRE_BAND: "[0.15, 0.9]",
  })) {
    assert.ok(source.includes(`export const ${name} = ${band};`), `${name} disagrees`);
  }
});

test("calibration: both copies of the Wilson interval agree", async () => {
  const source = await readFile(APP_POLICY, "utf8");
  assert.ok(source.includes("1.6448536269514722"), "the app must use the same 90% z value");
  // Spot-check the shape rather than re-implementing it: wide at n=12, narrower at n=120.
  const small = wilsonInterval(4, 12);
  const large = wilsonInterval(40, 120);
  assert.ok(small[1] - small[0] > large[1] - large[0]);
});

test("calibration: data for cards outside the deck is dropped, and must be visible", () => {
  // Confirmed live: a development run mixes dev fixtures into the deck, so the
  // export carries ids that pop-voices does not contain. Benign there — but the
  // same silence would hide data gathered against an older deck version, where
  // a card was retired or re-issued, and an editor would read "no changes
  // justified" as "the deck is stable".
  const cards = [{ id: "a", displayName: "A", status: "provisional" }];
  const totals = mergeExports([
    exportPayload([
      { cardId: "a", answered: 40, correct: 22, skips: 0, laughs: 5, groups: 10 },
      { cardId: "fixture-ember-07", answered: 5, correct: 3, skips: 0, laughs: 0, groups: 1 },
    ]),
  ]);

  // The unknown id contributes nothing to any proposal…
  const proposals = proposeTransitions(cards, totals);
  assert.deepEqual(proposals.map((p) => p.cardId), ["a"]);

  // …but it is still present in the merged totals, which is what lets the
  // importer count and report it rather than dropping it silently.
  assert.equal(totals.size, 2);
  const known = new Set(cards.map((c) => c.id));
  assert.deepEqual([...totals.keys()].filter((id) => !known.has(id)), ["fixture-ember-07"]);
});

test("calibration: a report retires a card regardless of its numbers", () => {
  const perfect = { answered: 40, correct: 22, skips: 0, laughs: 10, groups: 10 };
  assert.equal(verdictFor(perfect), "confirm");
  assert.equal(verdictFor(perfect, { reported: true }), "retire");
});
