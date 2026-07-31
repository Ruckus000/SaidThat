import AsyncStorage from "@react-native-async-storage/async-storage";
import { appendQueuedReport } from "../domain/reportPolicy.js";

export const REPORT_QUEUE_KEY = "said-that:offline-report-queue:v1";

/**
 * The storage backend is a parameter rather than a hard-wired import so this
 * module's real behaviour — malformed JSON, a non-array payload, the bounded
 * append — can be exercised by the `node --test` harness, which has no React
 * Native runtime. (AsyncStorage does import under node, but its methods are
 * absent there, so a test calling the default binding would throw rather than
 * test anything.)
 *
 * Production call sites use the default binding exported below, unchanged.
 */
export function createReportQueue(storage) {
  async function loadQueuedReports() {
    const stored = await storage.getItem(REPORT_QUEUE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // A malformed local cache is not a reason to block the game or collect
      // more data. Start a fresh queue and preserve the user's ability to play.
      return [];
    }
  }

  async function queueReport(report) {
    const queue = await loadQueuedReports();
    const next = appendQueuedReport(queue, report);
    await storage.setItem(REPORT_QUEUE_KEY, JSON.stringify(next));
    return next.length;
  }

  async function clearReportQueue() {
    await storage.removeItem(REPORT_QUEUE_KEY);
  }

  return { loadQueuedReports, queueReport, clearReportQueue };
}

const boundQueue = createReportQueue(AsyncStorage);

export const loadQueuedReports = boundQueue.loadQueuedReports;
export const queueReport = boundQueue.queueReport;
export const clearReportQueue = boundQueue.clearReportQueue;
