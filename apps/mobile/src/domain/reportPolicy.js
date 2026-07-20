export const MAX_QUEUED_REPORTS = 100;

export function appendQueuedReport(queue, report) {
  const safeQueue = Array.isArray(queue) ? queue : [];
  return [...safeQueue, report].slice(-MAX_QUEUED_REPORTS);
}
