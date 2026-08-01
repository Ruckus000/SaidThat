import { useCallback, useEffect, useReducer, useState } from "react";
import { Alert, AppState, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
import { catalog, DECK_VERSION } from "./src/content/catalog";
import { playableFixtureDeck } from "./src/content/validateDeck";
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
import { withTimeout } from "./src/storage/withTimeout";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

export default function App() {
  // Load VOLT faces (Bricolage Grotesque display + Inter body/counters). Render
  // is gated on load so text never flashes in a fallback face; on a load error we fall
  // through to the platform system face rather than showing nothing.
  const [fontsLoaded, fontError] = useFonts({
    Inter: require("./assets/fonts/InterVariable.ttf"),
    BricolageGrotesque: require("./assets/fonts/BricolageGrotesque.ttf"),
  });
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createSession({
      cards: playableFixtureDeck(catalog, { allowLocalFixtures }),
      allowLocalFixtures,
      deckVersion: DECK_VERSION,
    }),
  );
  const [reportBusy, setReportBusy] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [motionNeutralZ, setMotionNeutralZ] = useState<number | null>(null);
  const [calibrationReading, setCalibrationReading] = useState(false);
  const [calibrationUnavailable, setCalibrationUnavailable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
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

  // Tap commits fire the KICK haptic doublet inside the answer control (useFireEvent),
  // so the shared dispatch is haptic-free to avoid a double tick. The tilt path has no
  // press phase, so it fires its own single commit tick.
  const commitAnswer = useCallback((guessAuthentic: boolean) => {
    dispatch({ type: "ANSWER", guessAuthentic });
  }, []);
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
      if (!canCommitAnswer(state)) return;
      commitFeedback(hapticsAllowed({ hapticsEnabled }));
      commitAnswer(guessAuthentic);
    },
    [hapticsEnabled, commitAnswer, state],
  );

  useRoomBeaconMotion({
    enabled: motionAllowed({ motionOptIn, noMotion }) && state.stage === STAGES.ROUND,
    mode: state.mode,
    neutralZ: motionNeutralZ,
    onAnswer: commitAnswerFromTilt,
  });

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
    try {
      // Bounded for the same reason the reset is. `finally` looks like it
      // guarantees the busy flag is released, and it does — for a promise that
      // SETTLES. A wedged native bridge neither resolves nor rejects, so the
      // await never returned, `finally` never ran, and all three report chips
      // stayed disabled for the rest of the session with no way to retry.
      const queued = await withTimeout(
        queueReport(reportPayload(state, reason, new Date().toISOString())).then(() => true),
        { fallback: false },
      );
      dispatch({ type: queued ? "REPORT_QUEUED" : "REPORT_FAILED", roundIndex });
    } catch {
      dispatch({ type: "REPORT_FAILED", roundIndex });
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
    if (enabled) setMotionNeutralZ(null);
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
    setShowSettings(false);
    dispatch({
      type: "RESET_LOCAL_SESSION",
      cards: playableFixtureDeck(catalog, { allowLocalFixtures }),
      allowLocalFixtures,
      deckVersion: DECK_VERSION,
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
    // Surfaced on Home rather than as a second Alert. The confirm alert is still
    // dismissing when this runs, and iOS drops a modal presented mid-dismissal —
    // which would have silently restored the very bug this notice exists to fix.
    // On Home it cannot be dropped, and it survives long enough to be read.
    setResetNotice(resetReportsNotice(reportsCleared));
  }

  function goHome() {
    setMotionNeutralZ(null);
    dispatch({ type: "GO_HOME" });
  }

  function playAgain() {
    // Reshuffle in the UI layer so the reducer stays pure/deterministic.
    const deck = playableFixtureDeck(catalog, { allowLocalFixtures });
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setMotionNeutralZ(null);
    dispatch({ type: "PLAY_AGAIN", cards: deck, allowLocalFixtures });
  }

  function setMode(mode: string) {
    if (mode !== MODES.ROOM_BEACON) {
      setMotionOptIn(false);
      setMotionNeutralZ(null);
    }
    dispatch({ type: "SET_MODE", mode });
  }

  function setMotionOptInEnabled(enabled: boolean) {
    setMotionOptIn(enabled);
    if (!enabled) setMotionNeutralZ(null);
  }

  if (!fontsLoaded && !fontError) {
    // Fonts still loading: hold on the calm canvas (no unstyled text flash).
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.safe}>
          <StatusBar style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
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
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar style="light" />
        <View style={[s.app, bleed && s.appBleed]}>
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
              onStart={() => dispatch({ type: "START_ROUND" })}
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
            />
          )}
          {state.stage === STAGES.PRIVATE_SHUTTER && (
            <PrivateShutterScreen
              discardedPriorTurn={state.privateRecovery === "discarded-prior-turn"}
              onReady={() => dispatch({ type: "REVEAL_PRIVATE_TURN" })}
            />
          )}
          {state.stage === STAGES.PAUSED && (
            <PausedScreen onResume={() => dispatch({ type: "RESUME_ROOM" })} onLeave={goHome} />
          )}
          {state.stage === STAGES.CONTENT_UNAVAILABLE && <ContentUnavailableScreen fault={state.fault} />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
