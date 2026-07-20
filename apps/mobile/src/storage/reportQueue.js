import AsyncStorage from "@react-native-async-storage/async-storage";
import { appendQueuedReport } from "../domain/reportPolicy";

const REPORT_QUEUE_KEY = "said-that:offline-report-queue:v1";

export async function loadQueuedReports() {
  const stored = await AsyncStorage.getItem(REPORT_QUEUE_KEY);
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

export async function queueReport(report) {
  const queue = await loadQueuedReports();
  const next = appendQueuedReport(queue, report);
  await AsyncStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(next));
  return next.length;
}

export async function clearReportQueue() {
  await AsyncStorage.removeItem(REPORT_QUEUE_KEY);
}
