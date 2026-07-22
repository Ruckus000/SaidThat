import assert from "node:assert/strict";
import test from "node:test";

import { MARK_PATHS, MARK_VIEWBOX, markNames } from "./markPaths.js";

test("mark: the glyph family is complete and legible-by-shape", () => {
  const expected = ["open", "close", "selectionDot", "spoken", "struck", "spark"];
  assert.deepEqual(markNames().sort(), [...expected].sort());
  assert.match(MARK_VIEWBOX, /^0 0 \d+ \d+$/);
  for (const [name, d] of Object.entries(MARK_PATHS)) {
    assert.equal(typeof d, "string", `${name} path is a string`);
    assert.ok(d.trim().length > 0, `${name} path is non-empty`);
    assert.match(d.trim(), /^M/, `${name} path starts with a moveto`);
  }
});

test("mark: open and close are distinct glyphs", () => {
  assert.notEqual(MARK_PATHS.open, MARK_PATHS.close);
});

test("mark: no glyph encodes correctness or verification (truth-safety rule)", () => {
  const banned = ["check", "tick", "correct", "verified", "cross", "x"];
  for (const name of markNames()) {
    assert.ok(
      !banned.includes(name.toLowerCase()),
      `mark family must not contain a '${name}' glyph`,
    );
  }
});
