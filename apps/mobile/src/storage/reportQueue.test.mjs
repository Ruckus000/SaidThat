import assert from "node:assert/strict";
import test from "node:test";

import { MAX_QUEUED_REPORTS } from "../domain/reportPolicy.js";
import { REPORT_QUEUE_KEY, createReportQueue } from "./reportQueue.js";

// A minimal stand-in for AsyncStorage. `seed` lets a test start from a corrupted
// or hostile cache, which is the whole point of covering this module.
function fakeStorage(seed = null) {
  const cells = new Map();
  if (seed != null) cells.set(REPORT_QUEUE_KEY, seed);
  return {
    cells,
    async getItem(key) {
      return cells.has(key) ? cells.get(key) : null;
    },
    async setItem(key, value) {
      cells.set(key, value);
    },
    async removeItem(key) {
      cells.delete(key);
    },
  };
}

const report = (n) => ({ cardId: `fixture-${n}`, reason: "other", deckVersion: "test", timestamp: `t${n}` });

test("reports: an empty store yields an empty queue", async () => {
  const { loadQueuedReports } = createReportQueue(fakeStorage());
  assert.deepEqual(await loadQueuedReports(), []);
});

test("reports: a queued report round-trips and the count is returned", async () => {
  const storage = fakeStorage();
  const { queueReport, loadQueuedReports } = createReportQueue(storage);

  assert.equal(await queueReport(report(1)), 1);
  assert.equal(await queueReport(report(2)), 2);
  assert.deepEqual(await loadQueuedReports(), [report(1), report(2)]);
  // Stored under the versioned key, as JSON, and nowhere else.
  assert.deepEqual([...storage.cells.keys()], [REPORT_QUEUE_KEY]);
});

// The queue is a local file the user (or a bad write) can corrupt. It must never
// take the game down with it — reporting is optional, playing is not.
test("reports: a corrupted cache degrades to an empty queue instead of throwing", async () => {
  for (const junk of ["{not json", "null", '"a string"', "42", "{}"]) {
    const { loadQueuedReports, queueReport } = createReportQueue(fakeStorage(junk));
    assert.deepEqual(await loadQueuedReports(), [], `${junk} should read as empty`);
    // And a fresh report still lands on top of the discarded cache.
    assert.equal(await queueReport(report(1)), 1, `${junk} should still accept a report`);
  }
});

test("reports: the queue is bounded, dropping the oldest rather than growing forever", async () => {
  const storage = fakeStorage();
  const { queueReport, loadQueuedReports } = createReportQueue(storage);

  for (let n = 0; n < MAX_QUEUED_REPORTS + 25; n += 1) {
    await queueReport(report(n));
  }
  const queue = await loadQueuedReports();
  assert.equal(queue.length, MAX_QUEUED_REPORTS);
  // The newest survive and the oldest are dropped.
  assert.equal(queue.at(-1).cardId, `fixture-${MAX_QUEUED_REPORTS + 24}`);
  assert.equal(queue[0].cardId, "fixture-25");
});

test("reports: clearing removes the queue entirely, not just its contents", async () => {
  const storage = fakeStorage();
  const { queueReport, clearReportQueue, loadQueuedReports } = createReportQueue(storage);

  await queueReport(report(1));
  await clearReportQueue();
  assert.equal(storage.cells.has(REPORT_QUEUE_KEY), false, "the key itself is gone");
  assert.deepEqual(await loadQueuedReports(), []);
});

// RESET LOCAL SESSION awaits clearReportQueue, so a rejecting backend must surface
// as a rejection the caller can catch rather than a silently swallowed no-op.
test("reports: a failing backend rejects rather than failing silently", async () => {
  const failing = {
    async getItem() { throw new Error("storage unavailable"); },
    async setItem() { throw new Error("storage unavailable"); },
    async removeItem() { throw new Error("storage unavailable"); },
  };
  const { queueReport, clearReportQueue } = createReportQueue(failing);
  await assert.rejects(() => queueReport(report(1)), /storage unavailable/);
  await assert.rejects(() => clearReportQueue(), /storage unavailable/);
});
