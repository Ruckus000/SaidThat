export function motionAllowed({ motionOptIn, noMotion }) {
  return motionOptIn && !noMotion;
}

// Haptics are opt-out only (default on). They are an independent sensory channel:
// tap-only play stays complete without them, so they are never required.
export function hapticsAllowed({ hapticsEnabled }) {
  return hapticsEnabled === true;
}

/**
 * The device's Reduce Motion setting is a floor, not a default.
 *
 * The app previously seeded its own reduced-motion state to false and never
 * consulted the OS at all, so a player who had asked their device to reduce
 * motion still got the full suspense beat, the stamped verdict, and the ticker
 * until they found the in-app toggle. Someone who has set that preference has
 * already told us once.
 *
 * The in-app toggle can therefore only ADD to it: opting in without the device
 * setting works, opting out cannot override the device.
 */
export function reducedMotionActive({ reducedMotionPreference, deviceReducedMotion }) {
  return reducedMotionPreference === true || deviceReducedMotion === true;
}

/** True when the device setting alone is holding reduced motion on. */
export function reducedMotionForcedByDevice({ reducedMotionPreference, deviceReducedMotion }) {
  return deviceReducedMotion === true && reducedMotionPreference !== true;
}
