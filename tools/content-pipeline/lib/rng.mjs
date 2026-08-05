/**
 * Seeded PRNG shared by the pipeline and the app's run-builder.
 *
 * mulberry32: 32-bit state, no dependencies, and identical output in Node and
 * Hermes. Determinism is the whole point — a permutation test that gives a
 * different p-value on each run cannot gate CI, and a run-builder that cannot
 * be replayed from a seed cannot be tested.
 *
 * `apps/mobile/src/domain/rng.js` is a copy of this file. Both test suites
 * assert the same vector (see RNG_TEST_VECTOR) so the two cannot drift.
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

/** First five draws for seed 7, to nine decimal places. Asserted in both suites. */
export const RNG_TEST_VECTOR = { seed: 7, draws: 5, precision: 9 };

export function drawVector(seed = RNG_TEST_VECTOR.seed, count = RNG_TEST_VECTOR.draws) {
  const next = mulberry32(seed);
  return Array.from({ length: count }, () => Number(next().toFixed(RNG_TEST_VECTOR.precision)));
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
