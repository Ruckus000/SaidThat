import assert from "node:assert/strict";
import test from "node:test";

import { INTERACTIONS, interaction, usesKick } from "./interactionPolicy.js";

test("interaction: KICK fires only on the game answer-commit", () => {
  assert.equal(usesKick("answerCommit"), true);
  for (const kind of ["tap", "primary", "toggle"]) {
    assert.equal(usesKick(kind), false, `${kind} must not use KICK`);
  }
  // Exactly one interaction kind is allowed to carry the KICK.
  const kickKinds = Object.keys(INTERACTIONS).filter((k) => INTERACTIONS[k].spring === "kick");
  assert.deepEqual(kickKinds, ["answerCommit"]);
});

test("interaction: haptic phases match each kind", () => {
  assert.deepEqual(interaction("answerCommit"), { spring: "kick", pressInHaptic: "selection", commitHaptic: "commit" });
  assert.equal(interaction("toggle").commitHaptic, "selection");
  assert.equal(interaction("tap").commitHaptic, null);
  assert.equal(interaction("primary").spring, "snappy");
});

test("interaction: unknown kinds fall back to a calm tap", () => {
  assert.deepEqual(interaction("nope"), INTERACTIONS.tap);
  assert.equal(usesKick("nope"), false);
});
