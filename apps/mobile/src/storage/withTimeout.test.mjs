import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_STORAGE_TIMEOUT_MS, withTimeout } from "./withTimeout.js";

// Real timers with tiny durations rather than fake ones: this module is entirely
// about timing, and the node test runner has no timer mock. Durations are chosen
// so the assertions hold regardless of scheduler jitter.

test("storage: a settled promise passes straight through", async () => {
  assert.equal(await withTimeout(Promise.resolve("done"), { ms: 50 }), "done");
});

// The whole reason this exists. A wedged native bridge neither resolves nor
// rejects, so a try/catch around the call is no protection at all.
test("storage: a promise that never settles resolves the fallback instead of hanging", async () => {
  const never = new Promise(() => {});
  assert.equal(await withTimeout(never, { ms: 10, fallback: "gave-up" }), "gave-up");
});

test("storage: a rejection still rejects, because a refusing device is a real answer", async () => {
  await assert.rejects(
    () => withTimeout(Promise.reject(new Error("storage unavailable")), { ms: 50 }),
    /storage unavailable/,
  );
});

test("storage: a late settle after the timeout is ignored, not surfaced twice", async () => {
  let resolveLate;
  const late = new Promise((resolve) => {
    resolveLate = resolve;
  });

  const outcome = await withTimeout(late, { ms: 10, fallback: "gave-up" });
  assert.equal(outcome, "gave-up");

  // The straggler must not throw, double-resolve, or become an unhandled
  // rejection — nothing is listening for it any more.
  resolveLate("too late");
  await new Promise((resolve) => setTimeout(resolve, 20));
});

test("storage: a late rejection after the timeout does not become unhandled", async () => {
  let rejectLate;
  const late = new Promise((_resolve, reject) => {
    rejectLate = reject;
  });

  assert.equal(await withTimeout(late, { ms: 10, fallback: null }), null);

  rejectLate(new Error("arrived after we stopped waiting"));
  await new Promise((resolve) => setTimeout(resolve, 20));
});

test("storage: the default bound is a real number of milliseconds", () => {
  assert.ok(Number.isFinite(DEFAULT_STORAGE_TIMEOUT_MS));
  assert.ok(DEFAULT_STORAGE_TIMEOUT_MS > 0);
});
