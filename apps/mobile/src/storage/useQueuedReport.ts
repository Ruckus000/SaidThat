import { useCallback, useRef, useState } from "react";

import { queueReport } from "./reportQueue";
import { DEFAULT_STORAGE_TIMEOUT_MS } from "./withTimeout";

/**
 * Bounded local report write with rematch-safe confirmation.
 *
 * The queue write is the durable half; the reducer only displays status for the
 * current run/round. A late settle from a superseded attempt (rematch, home,
 * new start) must not paint "saved" onto a card nobody reported.
 */
export function useQueuedReport({
  roundIndex,
  runId,
  buildPayload,
  dispatch,
}: {
  roundIndex: number;
  runId: unknown;
  buildPayload: (reason: string) => unknown;
  dispatch: (action: { type: string; roundIndex?: number; runId?: unknown }) => void;
}) {
  const [reportBusy, setReportBusy] = useState(false);
  const attemptRef = useRef(0);

  const invalidatePending = useCallback(() => {
    attemptRef.current += 1;
  }, []);

  const report = useCallback(
    async (reason: string) => {
      if (reportBusy) return;
      setReportBusy(true);
      const attemptId = ++attemptRef.current;
      const payload = buildPayload(reason);
      const write = queueReport(payload).then(
        () => true as const,
        () => false as const,
      );
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const outcome = await Promise.race([
          write.then((ok) => {
            if (timeoutId != null) clearTimeout(timeoutId);
            return { kind: "settled" as const, ok };
          }),
          new Promise<{ kind: "timeout" }>((resolve) => {
            timeoutId = setTimeout(() => resolve({ kind: "timeout" }), DEFAULT_STORAGE_TIMEOUT_MS);
          }),
        ]);
        if (attemptId !== attemptRef.current) return;
        if (outcome.kind === "settled") {
          dispatch({
            type: outcome.ok ? "REPORT_QUEUED" : "REPORT_FAILED",
            roundIndex,
            runId,
          });
          return;
        }
        void write.then((ok) => {
          if (attemptId !== attemptRef.current) return;
          dispatch({
            type: ok ? "REPORT_QUEUED" : "REPORT_FAILED",
            roundIndex,
            runId,
          });
        });
      } catch {
        if (timeoutId != null) clearTimeout(timeoutId);
        if (attemptId === attemptRef.current) {
          dispatch({ type: "REPORT_FAILED", roundIndex, runId });
        }
      } finally {
        setReportBusy(false);
      }
    },
    [buildPayload, dispatch, reportBusy, roundIndex, runId],
  );

  return { reportBusy, report, invalidatePending };
}
