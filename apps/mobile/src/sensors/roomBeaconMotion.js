export const DEFAULT_DEBOUNCE_MS = 350;
export const DEFAULT_TILT_THRESHOLD = 0.35;
// Fraction of the threshold the phone must fall back inside to re-arm. Well under
// the commit threshold so the two bands cannot overlap and chatter.
export const DEFAULT_REARM_RATIO = 0.5;

/**
 * `armed` is the tilt gesture's edge detector, and it is the whole safety story.
 *
 * Without it the commit rule was a pure level test: "is the phone past the
 * threshold right now?". A phone simply HELD past the threshold therefore
 * answered every remaining round of the run — one sample after each round
 * mounted, each answer final under the one-commit-per-round rule. The debounce
 * did not help; it is wall-clock, and the listener is torn down at the reveal and
 * rebuilt at the next round already older than 350ms.
 *
 * A commit now requires an EDGE: the phone must fall back near level (re-arming)
 * before it can commit again. Holding still is not a gesture.
 */
export function createMotionGate({ debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  return { debounceMs, lastCommitAt: null, armed: true };
}

export function calibrateNeutral(sample) {
  if (!sample || typeof sample.z !== "number" || Number.isNaN(sample.z)) return null;
  return sample.z;
}

export function interpretTilt(
  sample,
  { neutralZ, threshold = DEFAULT_TILT_THRESHOLD } = {},
) {
  if (neutralZ == null || !sample || typeof sample.z !== "number" || Number.isNaN(sample.z)) {
    return null;
  }
  const delta = sample.z - neutralZ;
  if (Math.abs(delta) < threshold) return null;
  return delta > 0;
}

export function canCommitMotion(gate, now) {
  if (!gate.armed) return false;
  if (gate.lastCommitAt == null) return true;
  return now - gate.lastCommitAt >= gate.debounceMs;
}

export function recordMotionCommit(gate, now) {
  // Disarmed until the phone comes back near level: one tilt, one answer.
  return { ...gate, lastCommitAt: now, armed: false };
}

/** True when the phone has returned close enough to neutral to arm the next tilt. */
export function isRearmed(sample, { neutralZ, threshold = DEFAULT_TILT_THRESHOLD, rearmRatio = DEFAULT_REARM_RATIO } = {}) {
  if (neutralZ == null || !sample || typeof sample.z !== "number" || Number.isNaN(sample.z)) {
    return false;
  }
  return Math.abs(sample.z - neutralZ) < threshold * rearmRatio;
}

export function motionAnswerFromSample(sample, gate, options) {
  // Re-arm first: a sample near level is never a commit, only permission for the
  // next one. This is why the gate must survive across rounds — a phone still
  // held over at the next round has not passed through the band, so it stays
  // disarmed and cannot answer for the player.
  if (isRearmed(sample, options)) {
    return { gate: gate.armed ? gate : { ...gate, armed: true }, answer: null };
  }
  const guessAuthentic = interpretTilt(sample, options);
  if (guessAuthentic == null) return { gate, answer: null };
  const now = options.now ?? Date.now();
  if (!canCommitMotion(gate, now)) return { gate, answer: null };
  return {
    gate: recordMotionCommit(gate, now),
    answer: guessAuthentic,
  };
}
