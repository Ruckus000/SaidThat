import assert from "node:assert/strict";
import test from "node:test";

import {
  calibrateNeutral,
  createMotionGate,
  interpretTilt,
  motionAnswerFromSample,
} from "./roomBeaconMotion.js";

test("motion: calibration stores a neutral axis sample", () => {
  assert.equal(calibrateNeutral({ z: 0.12 }), 0.12);
  assert.equal(calibrateNeutral({ z: Number.NaN }), null);
  assert.equal(calibrateNeutral(null), null);
});

test("motion: neutral band ignores small movement", () => {
  const neutralZ = 0.1;
  assert.equal(interpretTilt({ z: 0.2 }, { neutralZ }), null);
  assert.equal(interpretTilt({ z: 0.55 }, { neutralZ }), true);
  assert.equal(interpretTilt({ z: -0.4 }, { neutralZ }), false);
});

test("motion: debounce prevents duplicate commits", () => {
  let gate = createMotionGate({ debounceMs: 100 });
  const options = { neutralZ: 0, now: 1000 };
  const first = motionAnswerFromSample({ z: 0.5 }, gate, options);
  assert.equal(first.answer, true);
  const duplicate = motionAnswerFromSample({ z: 0.5 }, first.gate, { ...options, now: 1050 });
  assert.equal(duplicate.answer, null);
  const later = motionAnswerFromSample({ z: -0.5 }, first.gate, { ...options, now: 1101 });
  assert.equal(later.answer, false);
});

test("motion: uncalibrated or invalid samples never commit", () => {
  const gate = createMotionGate();
  assert.equal(motionAnswerFromSample({ z: 0.9 }, gate, { neutralZ: null }).answer, null);
  assert.equal(motionAnswerFromSample(null, gate, { neutralZ: 0 }).answer, null);
});
