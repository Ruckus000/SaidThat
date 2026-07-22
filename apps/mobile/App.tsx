import { useCallback, useEffect, useReducer, useState } from "react";
import { Alert, AppState, SafeAreaView, View } from "react-native";
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
  runLength,
  shouldConcealScore,
} from "./src/domain/game";
import { commitFeedback } from "./src/feedback/haptics";
import { calibrateNeutral, readMotionSample, useRoomBeaconMotion } from "./src/sensors/useRoomBeaconMotion";
import { hapticsAllowed, motionAllowed } from "./src/settings/settingsPolicy";
import { clearReportQueue, queueReport } from "./src/storage/reportQueue";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

export default function App() {
  // Load the HOT MIC faces (Bricolage Grotesque display + Inter body/counters). Render
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
  const [showSettings, setShowSettings] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [noMotion, setNoMotion] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const card = currentCard(state);

  // Tap commits fire the KICK haptic doublet inside the answer control (useFireEvent),
  // so the shared dispatch is haptic-free to avoid a double tick. The tilt path has no
  // press phase, so it fires its own single commit tick.
  const commitAnswer = useCallback((guessAuthentic: boolean) => {
    dispatch({ type: "ANSWER", guessAuthentic });
  }, []);
  const commitAnswerFromTilt = useCallback(
    (guessAuthentic: boolean) => {
      commitFeedback(hapticsAllowed({ hapticsEnabled }));
      commitAnswer(guessAuthentic);
    },
    [hapticsEnabled, commitAnswer],
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
      <SafeAreaView style={s.safe}>
        <StatusBar style="light" />
      </SafeAreaView>
    );
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
            runComplete={state.roundsPlayed >= runLength(state)}
          />
        )}
        {state.stage === STAGES.HOME && showSettings && (
          <SettingsScreen
            reducedMotion={reducedMotion}
            noMotion={noMotion}
            hapticsEnabled={hapticsEnabled}
            onReducedMotion={setReducedMotion}
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
            motionOptIn={motionAllowed({ motionOptIn, noMotion })}
            motionCalibrated={motionNeutralZ != null}
            reducedMotion={reducedMotion}
            haptics={hapticsAllowed({ hapticsEnabled })}
            onCalibrate={calibrateMotion}
            onAnswer={commitAnswer}
            onPause={() => dispatch({ type: "APP_BACKGROUND" })}
          />
        )}
        {state.stage === STAGES.RESULT && (
          <ResultScreen
            correct={state.lastCorrect === true}
            streak={state.streak}
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
