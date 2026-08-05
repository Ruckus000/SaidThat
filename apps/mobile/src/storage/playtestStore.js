import AsyncStorage from "@react-native-async-storage/async-storage";

import { emptyStats } from "../domain/playtestPolicy.js";

export const PLAYTEST_KEY = "said-that:playtest-card-stats:v1";

/**
 * Local playtest aggregates.
 *
 * The storage backend is injected for the same reason `createReportQueue` does
 * it: the real behaviour — malformed JSON, a wedged backend, the bounded write
 * — has to be exercisable under `node --test`, which has no React Native
 * runtime.
 *
 * Nothing here is on the critical path of a round. Every failure mode resolves
 * to "the sample is lost", which is the correct trade for a calibration signal:
 * losing a data point is fine, blocking a party game is not.
 */
export function createPlaytestStore(storage) {
  async function loadStats() {
    try {
      const stored = await storage.getItem(PLAYTEST_KEY);
      if (!stored) return emptyStats();
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object" || typeof parsed.cards !== "object" || parsed.cards === null) {
        return emptyStats();
      }
      return { cards: parsed.cards };
    } catch {
      // A corrupt local cache must not block play, and must not be a reason to
      // start collecting more.
      return emptyStats();
    }
  }

  /** @param {import("../domain/playtestPolicy.js").PlaytestStats} stats */
  async function saveStats(stats) {
    try {
      await storage.setItem(PLAYTEST_KEY, JSON.stringify(stats));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read-modify-write through a caller-supplied pure update from playtestPolicy.
   * @param {(stats: import("../domain/playtestPolicy.js").PlaytestStats) => import("../domain/playtestPolicy.js").PlaytestStats} update
   */
  async function updateStats(update) {
    const stats = await loadStats();
    const next = update(stats);
    await saveStats(next);
    return next;
  }

  async function clearStats() {
    try {
      await storage.removeItem(PLAYTEST_KEY);
      return true;
    } catch {
      return false;
    }
  }

  return { loadStats, saveStats, updateStats, clearStats };
}

const store = createPlaytestStore(AsyncStorage);

export const loadPlaytestStats = store.loadStats;
export const savePlaytestStats = store.saveStats;
export const updatePlaytestStats = store.updateStats;
export const clearPlaytestStats = store.clearStats;
