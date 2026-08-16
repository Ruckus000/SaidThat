import assert from "node:assert/strict";
import test from "node:test";

import { MAX_QUEUED_REPORTS, appendQueuedReport } from "./reportPolicy.js";

test("report queue: the same run/round/reason attempt is not stacked twice", () => {
  const first = { cardId: "a", reason: "other", runId: 1, roundIndex: 0, timestamp: "t1" };
  const retry = { cardId: "a", reason: "other", runId: 1, roundIndex: 0, timestamp: "t2" };
  const queue = appendQueuedReport(appendQueuedReport([], first), retry);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].timestamp, "t1");
});

test("report queue: a different round or reason still appends", () => {
  const base = { cardId: "a", reason: "other", runId: 1, roundIndex: 0 };
  let queue = appendQueuedReport([], base);
  queue = appendQueuedReport(queue, { ...base, roundIndex: 1 });
  queue = appendQueuedReport(queue, { ...base, reason: "wrong-attribution" });
  queue = appendQueuedReport(queue, { ...base, runId: 2 });
  assert.equal(queue.length, 4);
});

test("report queue: flood bound still applies", () => {
  const queue = Array.from({ length: MAX_QUEUED_REPORTS + 10 }, (_, index) => ({
    cardId: String(index),
    reason: "other",
    runId: index,
    roundIndex: 0,
  })).reduce((records, report) => appendQueuedReport(records, report), []);
  assert.equal(queue.length, MAX_QUEUED_REPORTS);
});
