import assert from "node:assert/strict";
import test from "node:test";

import { markStartup, startupMarkMs, startupOriginMs } from "./startupMarks.js";

test("perf: startup markers are callable without throwing", () => {
  // Under node --test, __DEV__ is usually undefined so marks no-op — that is
  // the production shape. The API must still be safe to call from App.
  assert.doesNotThrow(() => markStartup("test-marker"));
  assert.equal(typeof startupOriginMs(), "number");
  // No-op path leaves the registry empty.
  assert.equal(startupMarkMs("test-marker"), null);
});
