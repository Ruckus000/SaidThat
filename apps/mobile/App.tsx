import { useCallback, useEffect, useReducer, useState } from "react";
import { AppState, SafeAreaView, View } from "react-native";
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
import { s } from "./src/components/styles";
import { catalog, DECK_VERSION } from "./src/content/catalog";
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
import { queueReport } from "./src/storage/reportQueue";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createSession({ cards: catalog, allowLocalFixtures, deckVersion: DECK_VERSION }),
  );
  const [reportBusy, setReportBusy] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [motionNeutralZ, setMotionNeutralZ] = useState<number | null>(null);
  const card = currentCard(state);

  const submitAnswer = useCallback((guessAuthentic: boolean) => {
    dispatch({ type: "ANSWER", guessAuthentic });
  }, []);

  useRoomBeaconMotion({
    enabled: motionOptIn && state.stage === STAGES.ROUND,
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
        <Header score={state.score} concealScore={shouldConcealScore(state)} onHome={goHome} />
        {state.stage === STAGES.HOME && (
          <HomeScreen onStart={() => dispatch({ type: "OPEN_SETUP" })} localFixtures={allowLocalFixtures} />
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
            motionOptIn={motionOptIn}
            motionCalibrated={motionNeutralZ != null}
            onCalibrate={calibrateMotion}
            onAnswer={submitAnswer}
            onPause={() => dispatch({ type: "APP_BACKGROUND" })}
          />
        )}
        {state.stage === STAGES.RESULT && (
          <ResultScreen
            correct={state.lastCorrect === true}
            onReview={() => dispatch({ type: "OPEN_REVIEW" })}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.REVIEW && card && (
          <ReviewScreen
            card={card}
            reportStatus={state.reportStatus}
            reportBusy={reportBusy}
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
