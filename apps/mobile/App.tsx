import { useCallback, useEffect, useReducer, useState } from "react";
import { Alert, AppState, SafeAreaView, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ContentUnavailableScreen } from "./src/components/ContentUnavailableScreen";
import { Header } from "./src/components/Header";
import { HomeScreen } from "./src/components/HomeScreen";
import { PausedScreen } from "./src/components/PausedScreen";
import { PrivateShutterScreen } from "./src/components/PrivateShutterScreen";
import { ResultScreen } from "./src/components/ResultScreen";
import { ReviewScreen } from "./src/components/ReviewScreen";
import { RoundScreen } from "./src/components/RoundScreen";
import { SetupScreen } from "./src/components/SetupScreen";
import { SettingsScreen } from "./src/components/SettingsScreen";
import { s } from "./src/components/styles";
import { catalog, DECK_VERSION } from "./src/content/catalog";
import { playableFixtureDeck } from "./src/content/validateDeck";
import {
  MODES,
  STAGES,
  canExposeCardToAssistiveTech,
  createSession,
  currentCard,
  gameReducer,
  reportPayload,
  shouldConcealScore,
} from "./src/domain/game";
import { calibrateNeutral, readMotionSample, useRoomBeaconMotion } from "./src/sensors/useRoomBeaconMotion";
import { motionAllowed } from "./src/settings/settingsPolicy";
import { clearReportQueue, queueReport } from "./src/storage/reportQueue";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

export default function App() {
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
  const [showSettings, setShowSettings] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [noMotion, setNoMotion] = useState(false);
  const card = currentCard(state);

  const submitAnswer = useCallback((guessAuthentic: boolean) => {
    dispatch({ type: "ANSWER", guessAuthentic });
  }, []);

  useRoomBeaconMotion({
    enabled: motionAllowed({ motionOptIn, noMotion }) && state.stage === STAGES.ROUND,
    mode: state.mode,
    neutralZ: motionNeutralZ,
    onAnswer: submitAnswer,
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
    try {
      await queueReport(reportPayload(state, reason, new Date().toISOString()));
      dispatch({ type: "REPORT_QUEUED" });
    } catch {
      dispatch({ type: "REPORT_FAILED" });
    } finally {
      setReportBusy(false);
    }
  }

  async function calibrateMotion() {
    const sample = await readMotionSample();
    const neutral = calibrateNeutral(sample);
    if (neutral != null) setMotionNeutralZ(neutral);
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
    await clearReportQueue();
    setMotionOptIn(false);
    setMotionNeutralZ(null);
    setShowSettings(false);
    dispatch({
      type: "RESET_LOCAL_SESSION",
      cards: playableFixtureDeck(catalog, { allowLocalFixtures }),
      allowLocalFixtures,
      deckVersion: DECK_VERSION,
    });
  }

  function goHome() {
    setMotionNeutralZ(null);
    dispatch({ type: "GO_HOME" });
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

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.app}>
        <Header
          score={state.score}
          streak={state.streak}
          concealScore={shouldConcealScore(state)}
          reducedMotion={reducedMotion}
          onHome={goHome}
        />
        {state.stage === STAGES.HOME && !showSettings && (
          <HomeScreen
            onStart={() => dispatch({ type: "OPEN_SETUP" })}
            onOpenSettings={() => setShowSettings(true)}
            localFixtures={allowLocalFixtures}
            reducedMotion={reducedMotion}
            roundsPlayed={state.roundsPlayed}
            correctCount={state.correctCount}
            bestStreak={state.bestStreak}
          />
        )}
        {state.stage === STAGES.HOME && showSettings && (
          <SettingsScreen
            reducedMotion={reducedMotion}
            noMotion={noMotion}
            onReducedMotion={setReducedMotion}
            onNoMotion={setNoMotionEnabled}
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
            motionOptIn={motionAllowed({ motionOptIn, noMotion })}
            motionCalibrated={motionNeutralZ != null}
            reducedMotion={reducedMotion}
            onCalibrate={calibrateMotion}
            onAnswer={submitAnswer}
            onPause={() => dispatch({ type: "APP_BACKGROUND" })}
          />
        )}
        {state.stage === STAGES.RESULT && (
          <ResultScreen
            correct={state.lastCorrect === true}
            streak={state.streak}
            reducedMotion={reducedMotion}
            onReview={() => dispatch({ type: "OPEN_REVIEW" })}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.REVIEW && card && (
          <ReviewScreen
            card={card}
            reportStatus={state.reportStatus}
            reportBusy={reportBusy}
            reducedMotion={reducedMotion}
            onReport={report}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.PRIVATE_SHUTTER && (
          <PrivateShutterScreen onReady={() => dispatch({ type: "REVEAL_PRIVATE_TURN" })} />
        )}
        {state.stage === STAGES.PAUSED && (
          <PausedScreen onResume={() => dispatch({ type: "RESUME_ROOM" })} />
        )}
        {state.stage === STAGES.CONTENT_UNAVAILABLE && <ContentUnavailableScreen fault={state.fault} />}
      </View>
    </SafeAreaView>
  );
}
