import { useCallback, useState } from "react";
import { Alert, Share } from "react-native";

import { toExport } from "../domain/playtestPolicy";
import { loadPlaytestStats } from "./playtestStore";
import { withTimeout } from "./withTimeout";

/**
 * Hands local calibration aggregates to the OS share sheet.
 *
 * There is no endpoint, no upload, and no background sync — nothing leaves
 * without someone choosing where it goes. A wedged share sheet must not latch
 * the button, and a double-tap must not stack sheets.
 */
export function usePlaytestExport(deckVersion: string) {
  const [exportBusy, setExportBusy] = useState(false);

  const exportPlaytestData = useCallback(async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const stats = await withTimeout(loadPlaytestStats(), { fallback: null });
      const payload = toExport(stats ?? { cards: {} }, deckVersion);
      if (payload.cards.length === 0) {
        Alert.alert("Nothing to export yet", "Play a run first — this only records per-card counts.");
        return;
      }
      const opened = await withTimeout(
        Share.share({ message: JSON.stringify(payload, null, 2) }).then(() => true),
        { fallback: false },
      );
      if (!opened) {
        Alert.alert("Export did not open", "Try again. Nothing left this device.");
      }
    } catch {
      // Sharing was dismissed or refused. Nothing was written and nothing was
      // sent, so there is nothing to report and nothing to undo.
    } finally {
      setExportBusy(false);
    }
  }, [deckVersion, exportBusy]);

  return { exportBusy, exportPlaytestData };
}
