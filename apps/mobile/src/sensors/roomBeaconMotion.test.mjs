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
  const gate = createMotionGate({ debounceMs: 100 });
  const options = { neutralZ: 0, now: 1000 };
  const first = motionAnswerFromSample({ z: 0.5 }, gate, options);
  assert.equal(first.answer, true);
  const duplicate = motionAnswerFromSample({ z: 0.5 }, first.gate, { ...options, now: 1050 });
  assert.equal(duplicate.answer, null);

  // This case previously asserted that waiting out the debounce was enough to
  // commit again while the phone was STILL tilted. That was the bug: it made the
  // commit rule a level test, so a held phone answered every round. Elapsed time
  // alone no longer earns a commit — the phone has to come back to level first.
  const stillHeld = motionAnswerFromSample({ z: -0.5 }, first.gate, { ...options, now: 1101 });
  assert.equal(stillHeld.answer, null, "a held phone must not commit again on debounce alone");

  const levelled = motionAnswerFromSample({ z: 0 }, first.gate, { ...options, now: 1102 });
  assert.equal(levelled.answer, null, "returning to level is permission, not an answer");
  const afterRearm = motionAnswerFromSample({ z: -0.5 }, levelled.gate, { ...options, now: 1200 });
  assert.equal(afterRearm.answer, false, "and then the next deliberate tilt commits");
});

test("motion: a phone held past the threshold answers once, not every round", () => {
  // The reported defect: with tilt calibrated, a steady hand played the whole run.
  // The listener is torn down at the reveal and rebuilt at the next round, so the
  // gate must survive across rounds — that persistence is what holds the line.
  const options = { neutralZ: 0 };
  let gate = createMotionGate();
  const held = { z: 0.8 };
  const answers = [];

  for (let round = 0; round < 7; round += 1) {
    // One sample per round mount, wall-clock far beyond the debounce each time.
    const result = motionAnswerFromSample(held, gate, { ...options, now: 1000 + round * 5000 });
    gate = result.gate;
    if (result.answer != null) answers.push(round);
  }

  assert.deepEqual(answers, [0], "only the round during which the tilt began may commit");
});

test("motion: re-arming needs a real return to level, not a drift inside the threshold", () => {
  const options = { neutralZ: 0 };
  const committed = motionAnswerFromSample({ z: 0.8 }, createMotionGate(), { ...options, now: 1000 });
  assert.equal(committed.answer, true);
  assert.equal(committed.gate.armed, false);

  // Inside the commit threshold (0.35) but outside the re-arm band (0.175): the
  // dead zone between the two. It must neither commit nor re-arm, or the gate
  // would chatter at the boundary.
  const drifting = motionAnswerFromSample({ z: 0.25 }, committed.gate, { ...options, now: 2000 });
  assert.equal(drifting.answer, null);
  assert.equal(drifting.gate.armed, false, "a partial return does not re-arm");

  const level = motionAnswerFromSample({ z: 0.05 }, drifting.gate, { ...options, now: 3000 });
  assert.equal(level.answer, null);
  assert.equal(level.gate.armed, true);
});

test("motion: an uncalibrated or invalid sample can never re-arm the gate", () => {
  const options = { neutralZ: 0 };
  const committed = motionAnswerFromSample({ z: 0.8 }, createMotionGate(), { ...options, now: 1000 });
  for (const bad of [null, { z: Number.NaN }, {}]) {
    const next = motionAnswerFromSample(bad, committed.gate, { ...options, now: 2000 });
    assert.equal(next.gate.armed, false, `${JSON.stringify(bad)} must not re-arm`);
    assert.equal(next.answer, null);
  }
  // A sample with no calibration cannot re-arm either.
  assert.equal(
    motionAnswerFromSample({ z: 0 }, committed.gate, { neutralZ: null, now: 2000 }).gate.armed,
    false,
  );
});

test("motion: uncalibrated or invalid samples never commit", () => {
  const gate = createMotionGate();
  assert.equal(motionAnswerFromSample({ z: 0.9 }, gate, { neutralZ: null }).answer, null);
  assert.equal(motionAnswerFromSample(null, gate, { neutralZ: 0 }).answer, null);
});
