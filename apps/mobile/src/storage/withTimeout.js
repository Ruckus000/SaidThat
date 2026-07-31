/**
 * Bound a promise that has no deadline of its own.
 *
 * AsyncStorage calls cross the native bridge, and a wedged bridge neither
 * resolves nor rejects — a `catch` is no protection against a promise that simply
 * never settles. Every guard in this app that reads "we handle storage failure"
 * means "we handle storage *rejection*"; this is what makes the other half true.
 *
 * Resolves `fallback` on timeout rather than rejecting, so callers keep a single
 * outcome to branch on and the timeout cannot become an unhandled rejection on the
 * async path React error boundaries do not catch.
 *
 * The underlying work is NOT cancelled — nothing here can cancel a native call.
 * If it settles later it is simply ignored, which is the honest bound: it stops
 * the UI waiting, it does not stop the write.
 */
export const DEFAULT_STORAGE_TIMEOUT_MS = 3000;

/**
 * Typed via JSDoc because this is a .js module consumed from .tsx. Without the
 * generic, `fallback`'s type is inferred from its `null` default, so a caller
 * passing `false` fails typecheck while working perfectly at runtime.
 *
 * @template T
 * @param {Promise<T>} promise the work to bound
 * @param {{ ms?: number, fallback?: T }} [options]
 * @returns {Promise<T>} the settled value, or `fallback` if the bound expired
 */
export function withTimeout(promise, { ms = DEFAULT_STORAGE_TIMEOUT_MS, fallback = null } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => finish(resolve, fallback), ms);
    // A rejection still rejects — a refusing device is a real answer and callers
    // already distinguish it. Only the never-settling case is converted.
    Promise.resolve(promise).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error),
    );
  });
}
