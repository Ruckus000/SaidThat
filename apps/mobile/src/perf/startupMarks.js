/**
 * Dev-only cold-start markers for physical-device timing.
 *
 * Release builds no-op. Jest stays deterministic because nothing asserts on
 * these values — they exist so a human with a mid-tier phone can log
 * `performance.now()` deltas into native-verification-checklist.md.
 *
 * Do not treat console output from a simulator as release evidence.
 */

const enabled = typeof __DEV__ !== "undefined" && __DEV__;

const originMs =
  enabled && typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : 0;

const marks = Object.create(null);

export function markStartup(label) {
  if (!enabled) return;
  if (typeof performance === "undefined" || typeof performance.now !== "function") return;
  const at = performance.now();
  marks[label] = at;
  const delta = (at - originMs).toFixed(1);
  console.log(`[startup] ${label}: +${delta}ms`);
}

export function startupMarkMs(label) {
  return marks[label] ?? null;
}

export function startupOriginMs() {
  return originMs;
}
