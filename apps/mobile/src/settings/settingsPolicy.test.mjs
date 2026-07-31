import assert from "node:assert/strict";
import test from "node:test";

import {
  hapticsAllowed,
  motionAllowed,
  reducedMotionActive,
  reducedMotionForcedByDevice,
} from "./settingsPolicy.js";

test("settings: no-motion disables optional tilt while tap-only remains available", () => {
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: false }), true);
  assert.equal(motionAllowed({ motionOptIn: true, noMotion: true }), false);
  assert.equal(motionAllowed({ motionOptIn: false, noMotion: false }), false);
});

test("settings: haptics are opt-out only and default on", () => {
  assert.equal(hapticsAllowed({ hapticsEnabled: true }), true);
  assert.equal(hapticsAllowed({ hapticsEnabled: false }), false);
});

// The app used to seed reduced motion to false and never ask the OS, so a device
// with Reduce Motion enabled still got the suspense beat, the stamped verdict and
// the ticker until the player found the in-app toggle.
test("settings: the device Reduce Motion setting is a floor the app cannot lower", () => {
  const active = (pref, device) =>
    reducedMotionActive({ reducedMotionPreference: pref, deviceReducedMotion: device });

  assert.equal(active(false, false), false, "neither: full motion");
  assert.equal(active(true, false), true, "opting in without the device setting works");
  assert.equal(active(false, true), true, "the device setting alone is enough");
  assert.equal(active(true, true), true);
  // The in-app toggle can only add. Turning it off must not defeat the device.
  assert.equal(active(false, true), true, "the toggle cannot override the device setting");
});

test("settings: the device lock is reported only while it alone holds motion down", () => {
  const forced = (pref, device) =>
    reducedMotionForcedByDevice({ reducedMotionPreference: pref, deviceReducedMotion: device });

  assert.equal(forced(false, true), true, "explain the stuck-looking toggle");
  assert.equal(forced(true, true), false, "the player also chose it; nothing to explain");
  assert.equal(forced(false, false), false);
  assert.equal(forced(true, false), false);
});
