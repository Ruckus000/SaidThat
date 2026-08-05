/**
 * Seeded PRNG. Copy of tools/content-pipeline/lib/rng.mjs.
 *
 * Duplicated rather than imported because the app bundle must not reach into
 * build-time tooling. Both test suites assert the same vector for seed 7, so
 * the two copies cannot drift without a test going red.
 *
 * mulberry32: 32-bit state, no dependencies, identical output in Node and
 * Hermes. Determinism is what makes a run reproducible from a single integer,
 * which is what makes the run-builder testable at all.
 */

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawVector(seed = 7, count = 5) {
  const next = mulberry32(seed);
  return Array.from({ length: count }, () => Number(next().toFixed(9)));
}

/** Fisher-Yates against a seeded stream. Does not mutate the input. */
export function seededShuffle(items, seed) {
  const next = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
