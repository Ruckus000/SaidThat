export function motionAllowed({ motionOptIn, noMotion }) {
  return motionOptIn && !noMotion;
}

// Haptics are opt-out only (default on). They are an independent sensory channel:
// tap-only play stays complete without them, so they are never required.
export function hapticsAllowed({ hapticsEnabled }) {
  return hapticsEnabled === true;
}
