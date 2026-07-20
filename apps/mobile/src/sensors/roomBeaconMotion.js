export const DEFAULT_DEBOUNCE_MS = 350;
export const DEFAULT_TILT_THRESHOLD = 0.35;

export function createMotionGate({ debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  return { debounceMs, lastCommitAt: null };
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
  if (gate.lastCommitAt == null) return true;
  return now - gate.lastCommitAt >= gate.debounceMs;
}

export function recordMotionCommit(gate, now) {
  return { ...gate, lastCommitAt: now };
}

export function motionAnswerFromSample(sample, gate, options) {
  const guessAuthentic = interpretTilt(sample, options);
  if (guessAuthentic == null) return { gate, answer: null };
  const now = options.now ?? Date.now();
  if (!canCommitMotion(gate, now)) return { gate, answer: null };
  return {
    gate: recordMotionCommit(gate, now),
    answer: guessAuthentic,
  };
}
