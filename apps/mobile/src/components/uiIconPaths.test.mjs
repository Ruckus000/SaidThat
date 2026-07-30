import assert from "node:assert/strict";
import test from "node:test";

import { UI_ICON_PATHS, UI_ICON_VIEWBOX, uiIconNames } from "./uiIconPaths.js";
import { markNames } from "./markPaths.js";

test("icon: UI icons are well-formed path data on a shared viewBox", () => {
  assert.match(UI_ICON_VIEWBOX, /^0 0 \d+ \d+$/);
  assert.ok(uiIconNames().length > 0, "there is at least one UI icon");
  for (const [name, d] of Object.entries(UI_ICON_PATHS)) {
    assert.equal(typeof d, "string", `${name} path is a string`);
    assert.ok(d.trim().length > 0, `${name} path is non-empty`);
    assert.match(d.trim(), /^M/, `${name} path starts with a moveto`);
    // Drawn as filled shapes so a single `fill` colors them at any size — a
    // stroke-based icon would need per-size width tuning to stay optically even.
    assert.doesNotMatch(d, /stroke/i, `${name} must be a filled shape, not a stroke`);
  }
});

test("icon: the gear is a closed shape with a counter-drawn hub", () => {
  const gear = UI_ICON_PATHS.gear;
  // Two subpaths: the toothed outline and the hub that evenodd knocks out of it.
  assert.equal((gear.match(/M/g) || []).length, 2, "gear has an outline and a hub subpath");
  assert.equal((gear.match(/Z/g) || []).length, 2, "both gear subpaths are closed");
});

// THE MARK is the identity language and carries meaning; UI icons are functional
// chrome. Keeping the namespaces disjoint stops a plain affordance from drifting
// into the glyph vocabulary that expresses game state.
test("icon: the UI icon set never overlaps THE MARK", () => {
  const overlap = uiIconNames().filter((n) => markNames().includes(n));
  assert.deepEqual(overlap, [], "UI icons and MARK glyphs must not share names");
});
