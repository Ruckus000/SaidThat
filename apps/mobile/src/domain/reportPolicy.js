export const MAX_QUEUED_REPORTS = 100;

function sameReportAttempt(a, b) {
  return (
    a &&
    b &&
    a.runId != null &&
    a.roundIndex != null &&
    a.reason != null &&
    a.runId === b.runId &&
    a.roundIndex === b.roundIndex &&
    a.reason === b.reason
  );
}

export function appendQueuedReport(queue, report) {
  const safeQueue = Array.isArray(queue) ? queue : [];
  // A chip press that times out in the UI can still land a write, then a retry
  // (or a late double-settle) would stack two durable entries for one press.
  // Same run + round + reason means one attempt window — keep the first.
  if (safeQueue.some((entry) => sameReportAttempt(entry, report))) {
    return safeQueue;
  }
  return [...safeQueue, report].slice(-MAX_QUEUED_REPORTS);
}
