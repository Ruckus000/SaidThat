import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Alert, AppState, Share, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

import { ContentUnavailableScreen } from "./src/components/ContentUnavailableScreen";
import { Header } from "./src/components/Header";
import { HomeScreen } from "./src/components/HomeScreen";
import { PausedScreen } from "./src/components/PausedScreen";
import { PrivateShutterScreen } from "./src/components/PrivateShutterScreen";
import { RecapScreen } from "./src/components/RecapScreen";
import { ResultScreen } from "./src/components/ResultScreen";
import { ReviewScreen } from "./src/components/ReviewScreen";
import { RoundScreen } from "./src/components/RoundScreen";
import { SetupScreen } from "./src/components/SetupScreen";
import { SettingsScreen } from "./src/components/SettingsScreen";
import { resetReportsNotice } from "./src/components/presentationLabels";
import { s } from "./src/components/styles";
import { catalog, DECK_VERSION, TOMBSTONES } from "./src/content/catalog";
import { playableDeck } from "./src/content/validateDeck";
import {
  MODES,
  STAGES,
  canCommitAnswer,
  canExposeCardToAssistiveTech,
  createSession,
  currentCard,
  gameReducer,
  reportPayload,
  runLength,
} from "./src/domain/game";
import { isGuessCorrect } from "./src/domain/contentRules";
import { commitFeedback } from "./src/feedback/haptics";
import { calibrateNeutral, readMotionSample, useRoomBeaconMotion } from "./src/sensors/useRoomBeaconMotion";
import {
  hapticsAllowed,
  motionAllowed,
  reducedMotionActive,
  reducedMotionForcedByDevice,
} from "./src/settings/settingsPolicy";
import { useReducedMotion } from "./src/theme/motion";
import { clearReportQueue, queueReport } from "./src/storage/reportQueue";
import { clearPlaytestStats, loadPlaytestStats, updatePlaytestStats } from "./src/storage/playtestStore";
import { recordGroup, recordLaugh, recordOutcome, toExport } from "./src/domain/playtestPolicy";
import { DEFAULT_STORAGE_TIMEOUT_MS, withTimeout } from "./src/storage/withTimeout";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

/**
 * Entropy for a run, generated here rather than inside the reducer.
 *
 * The reducer must stay a pure function of (state, action) — the chaos tests
 * depend on replaying an action sequence and getting the same state — so the
 * randomness lives in the UI and travels as data on the action. A single
 * integer is enough to reproduce any run exactly, which is what makes the
 * run-builder testable.
 */
function runSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export default function App() {
  // Load VOLT faces (Bricolage Grotesque display + Inter body/counters). Render
  // is gated on load so text never flashes in a fallback face; on a load error we fall
  // through to the platform system face rather than showing nothing.
  const [fontsLoaded, fontError] = useFonts({
    Inter: require("./assets/fonts/InterVariable.ttf"),
    BricolageGrotesque: require("./assets/fonts/BricolageGrotesque.ttf"),
  });
  // Re-renders when the system text size changes; see the key below.
  const { fontScale } = useWindowDimensions();
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createSession({
      cards: playableDeck(catalog, { allowLocalFixtures }, TOMBSTONES),
      allowLocalFixtures,
      deckVersion: DECK_VERSION,
      seed: runSeed(),
      // Home never needs a sampled run; START_ROUND builds it on first play.
      deferRun: true,
    }),
  );
  const [reportBusy, setReportBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [motionNeutralZ, setMotionNeutralZ] = useState<number | null>(null);
  const [calibrationReading, setCalibrationReading] = useState(false);
  const [calibrationUnavailable, setCalibrationUnavailable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  // Which card the room named as the biggest reaction this run. Cleared on a
  // new run so the next recap starts unpicked.
  const [laughPick, setLaughPick] = useState<string | null>(null);
  // Which round's verdict the player has already seen. Held here rather than in
  // ResultScreen because that screen UNMOUNTS on an interruption — backgrounding
  // routes through PAUSED — and a component key cannot preserve state across an
  // unmount. Keyed by round so the next one still gets its suspense beat.
  // Cleared on every fresh run: rematch resets roundIndex to 0, so a stale
  // revealedRound === 0 would skip the beat on the new run's first card.
  const [revealedRound, setRevealedRound] = useState<number | null>(null);
  // Monotonic id so a late report settle from a superseded attempt cannot
  // overwrite UI status after rematch/continue, while a late success for the
  // *current* attempt can still upgrade a silent timeout to "saved".
  const reportAttemptRef = useRef(0);
  const [reducedMotionPreference, setReducedMotionPreference] = useState(false);
  const [noMotion, setNoMotion] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  // The device's Reduce Motion setting is honoured directly, not just mirrored
  // into a default: someone who set it has already told us once, and the in-app
  // toggle can only add to it.
  const deviceReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionActive({ reducedMotionPreference, deviceReducedMotion });
  const motionLockedByDevice = reducedMotionForcedByDevice({ reducedMotionPreference, deviceReducedMotion });
  const card = currentCard(state);

  // Stable tilt path: refs hold the latest state/haptics so commitAnswerFromTilt
  // identity does not churn every ANSWER and force Accelerometer resubscribe.
  const stateRef = useRef(state);
  stateRef.current = state;
  const hapticsEnabledRef = useRef(hapticsEnabled);
  hapticsEnabledRef.current = hapticsEnabled;

  // Tap commits fire the KICK haptic doublet inside the answer control (useFireEvent),
  // so the shared dispatch is haptic-free to avoid a double tick. The tilt path has no
  // press phase, so it fires its own single commit tick.
  const commitAnswer = useCallback((guessAuthentic: boolean) => {
    // Calibration is recorded before dispatch so it reads the card the player
    // actually answered, and is deliberately not awaited: this is a research
    // signal, and a wedged storage bridge must never delay a commit the room
    // is waiting on. Losing a sample is the correct failure here.
    const answered = currentCard(stateRef.current);
    if (answered) {
      const correct = isGuessCorrect(answered, guessAuthentic);
      void updatePlaytestStats((stats) =>
        recordOutcome(stats, { cardId: answered.id, correct }),
      ).catch(() => {});
    }
    dispatch({ type: "ANSWER", guessAuthentic });
  }, []);

  /**
   * Hands the local calibration aggregates to the OS share sheet.
   *
   * This is the entire delivery mechanism: a human exports the file and carries
   * it to an editor. There is no endpoint, no upload, and no background sync —
   * which is what makes the capture defensible without a consent flow, since
   * nothing can leave without someone choosing where it goes.
   */
  async function exportPlaytestData() {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const stats = await withTimeout(loadPlaytestStats(), { fallback: null });
      const payload = toExport(stats ?? { cards: {} }, DECK_VERSION);
      if (payload.cards.length === 0) {
        Alert.alert("Nothing to export yet", "Play a run first — this only records per-card counts.");
        return;
      }
      // Bounded like report/reset: a wedged share sheet must not latch the button
      // forever, and a double-tap must not stack sheets.
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
  }

  /** One optional room-level pick per run. Tapping again moves it. */
  const pickFunniest = useCallback(
    (cardId: string) => {
      setLaughPick(cardId);
      void updatePlaytestStats((stats) => recordLaugh(stats, { cardId })).catch(() => {});
    },
    [],
  );
  const commitAnswerFromTilt = useCallback(
    (guessAuthentic: boolean) => {
      // The haptic fires only if the reducer actually takes the answer. It used
      // to fire first, unconditionally, so a tilt the reducer rejected — the
      // round already committed, or the stage left ROUND in a race with
      // APP_BACKGROUND — still buzzed. On this screen the buzz IS the
      // confirmation, so that told the room an answer had landed when none had.
      //
      // Asked of the reducer's own predicate rather than re-stated here, so the
      // two cannot drift into disagreeing about what counts as a commit.
      if (!canCommitAnswer(stateRef.current)) return;
      commitFeedback(hapticsAllowed({ hapticsEnabled: hapticsEnabledRef.current }));
      commitAnswer(guessAuthentic);
    },
    [commitAnswer],
  );

  const onMotionUnavailable = useCallback(() => {
    setMotionNeutralZ(null);
    setCalibrationUnavailable(true);
  }, []);

  useRoomBeaconMotion({
    enabled: motionAllowed({ motionOptIn, noMotion }) && state.stage === STAGES.ROUND,
    mode: state.mode,
    neutralZ: motionNeutralZ,
    onAnswer: commitAnswerFromTilt,
    onUnavailable: onMotionUnavailable,
  });

  // A completed run counts as one group for each card it contained. Groups are
  // what the promote/retire thresholds are actually gated on: twenty exposures
  // from one room says far less than twenty from eight, and without this the
  // verdicts would treat those as identical evidence.
  //
  // Slice by roundsPlayed (answered cards), not runLength: a final-round
  // private interrupt without an answer ends in RECAP with an incomplete count.
  useEffect(() => {
    if (state.stage !== STAGES.RECAP) return;
    const played = state.cards
      .slice(0, state.roundsPlayed ?? 0)
      .map((entry: { id: string }) => entry.id);
    if (played.length === 0) return;
    void updatePlaytestStats((stats) => recordGroup(stats, played)).catch(() => {});
    // Keyed on the recap transition rather than the card list so a re-render
    // cannot double-count the same run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        dispatch({ type: "APP_BACKGROUND" });
      }
    });
    return () => subscription.remove();
  }, []);

  async function report(reason: string) {
    if (reportBusy) return;
    setReportBusy(true);
    // Captured before the await, and carried on the action. The player can reach
    // the next card while the write is in flight, and a confirmation that lands
    // then would be attached to a card nobody reported. The reducer drops a stale
    // one; the report itself is already written either way.
    const roundIndex = state.roundIndex;
    const runId = state.runId;
    const attemptId = ++reportAttemptRef.current;
    const payload = reportPayload(state, reason, new Date().toISOString());
    // Keep the underlying write observable after a UI timeout so a late success
    // can still surface "saved" for this attempt — without claiming failure while
    // the write is merely slow. Queue dedupe covers a user retry of the same chip.
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
      if (attemptId !== reportAttemptRef.current) return;
      if (outcome.kind === "settled") {
        dispatch({
          type: outcome.ok ? "REPORT_QUEUED" : "REPORT_FAILED",
          roundIndex,
          runId,
        });
        return;
      }
      // Timed out: release the chips, but if this attempt's write lands later
      // and nothing superseded it, upgrade to an honest saved/failed status.
      void write.then((ok) => {
        if (attemptId !== reportAttemptRef.current) return;
        dispatch({
          type: ok ? "REPORT_QUEUED" : "REPORT_FAILED",
          roundIndex,
          runId,
        });
      });
    } catch {
      if (timeoutId != null) clearTimeout(timeoutId);
      if (attemptId === reportAttemptRef.current) {
        dispatch({ type: "REPORT_FAILED", roundIndex, runId });
      }
    } finally {
      setReportBusy(false);
    }
  }

  async function calibrateMotion() {
    // The read is bounded and never rejects, so this cannot hang and cannot throw
    // — but it CAN legitimately come back empty on a device with no accelerometer
    // or a denied permission. Say so, rather than leaving a button that silently
    // does nothing. Tap is unaffected either way.
    if (calibrationReading) return;
    setCalibrationReading(true);
    setCalibrationUnavailable(false);
    const neutral = calibrateNeutral(await readMotionSample());
    setCalibrationReading(false);
    if (neutral == null) {
      setCalibrationUnavailable(true);
      return;
    }
    setMotionNeutralZ(neutral);
  }

  function setNoMotionEnabled(enabled: boolean) {
    setNoMotion(enabled);
    if (enabled) {
      setMotionNeutralZ(null);
      setCalibrationUnavailable(false);
    }
  }

  function confirmResetLocalSession() {
    Alert.alert(
      "Reset local session?",
      "This clears the current room progress and locally queued reports on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => void resetLocalSession() },
      ],
    );
  }

  async function resetLocalSession() {
    // The in-memory reset happens FIRST, and synchronously. It does not depend on
    // storage at all, so nothing storage does — refusing, or never answering —
    // should be able to delay or cancel the session the player asked to end.
    //
    // The previous ordering awaited the queue first. A `catch` covered a refusing
    // device, but a wedged native bridge neither resolves nor rejects: the await
    // simply never returned, every line below it was skipped, and the confirmed
    // destructive action did nothing at all. That is the same bug this function
    // was written to fix, one layer down.
    setMotionOptIn(false);
    setMotionNeutralZ(null);
    setCalibrationUnavailable(false);
    setShowSettings(false);
    setRevealedRound(null);
    reportAttemptRef.current += 1;
    dispatch({
      type: "RESET_LOCAL_SESSION",
      cards: playableDeck(catalog, { allowLocalFixtures }, TOMBSTONES),
      allowLocalFixtures,
      deckVersion: DECK_VERSION,
      seed: runSeed(),
      deferRun: true,
    });

    // Now the durable half, bounded. The confirm promised to clear queued reports
    // too, so a failure — refusal or silence — still has to be reported honestly.
    let reportsCleared = true;
    try {
      reportsCleared = await withTimeout(clearReportQueue().then(() => true), {
        fallback: false,
      });
    } catch {
      reportsCleared = false;
    }

    // Playtest aggregates are local session data too, so "reset local session"
    // has to clear them. Bounded and swallowed like the queue: this is a
    // research signal, and failing to clear it must not turn into a second
    // failure notice competing with the one the player actually needs.
    setLaughPick(null);
    try {
      await withTimeout(clearPlaytestStats(), { fallback: false });
    } catch {
      /* the sample outlives the reset; not worth a notice */
    }

    // Surfaced on Home rather than as a second Alert. The confirm alert is still
    // dismissing when this runs, and iOS drops a modal presented mid-dismissal —
    // which would have silently restored the very bug this notice exists to fix.
    // On Home it cannot be dropped, and it survives long enough to be read.
    setResetNotice(resetReportsNotice(reportsCleared));
  }

  function goHome() {
    setMotionNeutralZ(null);
    setCalibrationUnavailable(false);
    setRevealedRound(null);
    reportAttemptRef.current += 1;
    dispatch({ type: "GO_HOME" });
  }

  function playAgain() {
    // The UI owns the entropy, the reducer owns the selection. Passing a seed
    // keeps gameReducer a pure function of (state, action) while still giving a
    // different run each rematch — and makes any run reproducible from one
    // integer, which is what the run-builder tests rely on.
    setMotionNeutralZ(null);
    setCalibrationUnavailable(false);
    setLaughPick(null);
    setRevealedRound(null);
    reportAttemptRef.current += 1;
    dispatch({ type: "PLAY_AGAIN", seed: runSeed(), allowLocalFixtures });
  }

  function setMode(mode: string) {
    if (mode !== MODES.ROOM_BEACON) {
      setMotionOptIn(false);
      setMotionNeutralZ(null);
      setCalibrationUnavailable(false);
    }
    dispatch({ type: "SET_MODE", mode });
  }

  function setMotionOptInEnabled(enabled: boolean) {
    setMotionOptIn(enabled);
    if (!enabled) {
      setMotionNeutralZ(null);
      setCalibrationUnavailable(false);
    }
  }

  const markRoundRevealed = useCallback(() => {
    setRevealedRound(state.roundIndex);
  }, [state.roundIndex]);

  if (!fontsLoaded && !fontError) {
    // Fonts still loading: hold on the calm canvas (no unstyled text flash).
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  // Only the result flash goes full-bleed. Five stages drop the wordmark row but
  // keep their gutters: Round carries score/streak in its own top row, Recap opens
  // on the spark MARK, the shutter carries its own PRIVATE HANDOFF pill (the
  // header used to render that same label a second time), and Paused is a
  // single-purpose off-ramp whose only action is resuming the room.
  const bleed = state.stage === STAGES.RESULT;
  const showHeader = ![
    STAGES.RESULT,
    STAGES.ROUND,
    STAGES.RECAP,
    STAGES.PRIVATE_SHUTTER,
    STAGES.PAUSED,
  ].includes(state.stage);
  const totalRounds = runLength(state);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      {/*
        Keyed on the text scale so the screens remount when the player changes it
        in Settings and comes back. Changing it while the app runs left text drawn
        at the new size inside frames measured at the old one: the wordmark showed
        "SAI" and the ticker a clipped fragment, because both size themselves from
        a measurement taken once on mount. A fresh launch was always correct, which
        is what made it look like a rendering bug rather than a stale one.

        The key is HERE and not on the SafeAreaView on purpose: the reducer, the
        settings flags and the reset notice all live above this node, so the room's
        score and stage survive the remount. What is thrown away is exactly what
        needs re-measuring — and a scroll offset, which is worth the trade.
      */}
      <View key={`text-scale-${fontScale}`} style={[s.app, bleed && s.appBleed]}>
        {showHeader && (
          <Header
            score={state.score}
            streak={state.streak}
            reducedMotion={reducedMotion}
            onHome={goHome}
            onSettings={state.stage === STAGES.HOME && !showSettings ? () => setShowSettings(true) : undefined}
          />
        )}
        {state.stage === STAGES.HOME && !showSettings && (
          <HomeScreen
            onStart={() => {
              // Read once. Starting a room is the acknowledgement.
              setResetNotice(null);
              dispatch({ type: "OPEN_SETUP" });
            }}
            notice={resetNotice}
            localFixtures={allowLocalFixtures}
            deckCards={state.pool}
            reducedMotion={reducedMotion}
            roundsPlayed={state.roundsPlayed}
            correctCount={state.correctCount}
            bestStreak={state.bestStreak}
            runComplete={state.roundsPlayed >= totalRounds}
          />
        )}
        {state.stage === STAGES.HOME && showSettings && (
          <SettingsScreen
            reducedMotion={reducedMotion}
            noMotion={noMotion}
            hapticsEnabled={hapticsEnabled}
            motionLockedByDevice={motionLockedByDevice}
            onReducedMotion={setReducedMotionPreference}
            onNoMotion={setNoMotionEnabled}
            onHaptics={setHapticsEnabled}
            onReset={confirmResetLocalSession}
            onClose={() => setShowSettings(false)}
            onExportPlaytest={exportPlaytestData}
            exportBusy={exportBusy}
          />
        )}
        {state.stage === STAGES.SETUP && (
          <SetupScreen
            mode={state.mode}
            accessRole={state.accessRole}
            motionOptIn={motionOptIn}
            onMode={setMode}
            onRole={(accessRole) => dispatch({ type: "SET_ACCESS_ROLE", accessRole })}
            onMotionOptIn={setMotionOptInEnabled}
            onStart={() => {
              setLaughPick(null);
              setRevealedRound(null);
              reportAttemptRef.current += 1;
              dispatch({ type: "START_ROUND", seed: runSeed() });
            }}
          />
        )}
        {state.stage === STAGES.ROUND && card && (
          <RoundScreen
            card={card}
            mode={state.mode}
            hideCardFromAssistiveTech={!canExposeCardToAssistiveTech(state)}
            round={state.roundIndex + 1}
            totalRounds={totalRounds}
            score={state.score}
            streak={state.streak}
            motionOptIn={motionAllowed({ motionOptIn, noMotion })}
            motionCalibrated={motionNeutralZ != null}
          calibrationReading={calibrationReading}
          calibrationUnavailable={calibrationUnavailable}
            reducedMotion={reducedMotion}
            haptics={hapticsAllowed({ hapticsEnabled })}
            onCalibrate={calibrateMotion}
            onAnswer={commitAnswer}
            onPause={() => dispatch({ type: "REQUEST_PAUSE" })}
          />
        )}
        {state.stage === STAGES.RESULT && (
          <ResultScreen
            correct={state.lastCorrect === true}
            streak={state.streak}
            roundIndex={state.roundIndex}
            totalRounds={totalRounds}
            reducedMotion={reducedMotion}
            haptics={hapticsAllowed({ hapticsEnabled })}
            initiallyRevealed={revealedRound === state.roundIndex}
            onRevealed={markRoundRevealed}
            onReview={() => dispatch({ type: "OPEN_REVIEW" })}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.REVIEW && card && (
          <ReviewScreen
            card={card}
            reportStatus={state.reportStatus}
            reportBusy={reportBusy}
            roundIndex={state.roundIndex}
            totalRounds={totalRounds}
            reducedMotion={reducedMotion}
            onReport={report}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.RECAP && (
          <RecapScreen
            score={state.score}
            correctCount={state.correctCount}
            roundsPlayed={state.roundsPlayed}
            bestStreak={state.bestStreak}
            reducedMotion={reducedMotion}
            onPlayAgain={playAgain}
            onHome={goHome}
            runCards={state.cards
              .slice(0, state.roundsPlayed ?? 0)
              .map((entry: { id: string; person: string }) => ({
                id: entry.id,
                person: entry.person,
              }))}
            laughPickId={laughPick}
            onPickFunniest={pickFunniest}
          />
        )}
        {state.stage === STAGES.PRIVATE_SHUTTER && (
          <PrivateShutterScreen
            privateRecovery={state.privateRecovery}
            onReady={() => dispatch({ type: "REVEAL_PRIVATE_TURN" })}
          />
        )}
        {state.stage === STAGES.PAUSED && (
          <PausedScreen onResume={() => dispatch({ type: "RESUME_ROOM" })} onLeave={goHome} />
        )}
        {state.stage === STAGES.CONTENT_UNAVAILABLE && <ContentUnavailableScreen fault={state.fault} />}
      </View>
    </SafeAreaView>
  );
}
