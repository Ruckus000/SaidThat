import assert from "node:assert/strict";
import test from "node:test";

import { motionAllowed } from "./settingsPolicy.js";

test("settings: no-motion disables optional tilt while tap-only remains available", () => {
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: false }), true);
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: true }), false);
  assert.equal(motionAllowed({ motionOptIn: false, noMotion: false }), false);
});
