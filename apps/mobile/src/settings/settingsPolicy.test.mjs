import assert from "node:assert/strict";
import test from "node:test";

import { hapticsAllowed, motionAllowed } from "./settingsPolicy.js";

test("settings: no-motion disables optional tilt while tap-only remains available", () => {
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: false }), true);
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: true }), false);
  assert.equal(motionAllowed({ motionOptIn: false, noMotion: false }), false);
});

test("settings: haptics are opt-out only and default on", () => {
  assert.equal(hapticsAllowed({ hapticsEnabled: true }), true);
  assert.equal(hapticsAllowed({ hapticsEnabled: false }), false);
});
