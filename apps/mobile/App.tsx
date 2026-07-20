import { useEffect, useReducer, useState } from "react";
import {
  AppState,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { catalog, DECK_VERSION } from "./src/content/catalog";
import { tokens as t } from "./src/theme/tokens";
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
import { queueReport } from "./src/storage/reportQueue";

const allowLocalFixtures = typeof __DEV__ !== "undefined" && __DEV__;

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createSession({ cards: catalog, allowLocalFixtures, deckVersion: DECK_VERSION }),
  );
  const [reportBusy, setReportBusy] = useState(false);
  const card = currentCard(state);

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

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.app}>
        <Header score={state.score} concealScore={shouldConcealScore(state)} onHome={() => dispatch({ type: "GO_HOME" })} />
        {state.stage === STAGES.HOME && (
          <Home onStart={() => dispatch({ type: "OPEN_SETUP" })} localFixtures={allowLocalFixtures} />
        )}
        {state.stage === STAGES.SETUP && (
          <Setup
            mode={state.mode}
            accessRole={state.accessRole}
            onMode={(mode) => dispatch({ type: "SET_MODE", mode })}
            onRole={(accessRole) => dispatch({ type: "SET_ACCESS_ROLE", accessRole })}
            onStart={() => dispatch({ type: "START_ROUND" })}
          />
        )}
        {state.stage === STAGES.ROUND && card && (
          <Round
            card={card}
            mode={state.mode}
            hideCardFromAssistiveTech={!canExposeCardToAssistiveTech(state)}
            round={state.roundIndex + 1}
            onAnswer={(guessAuthentic) => dispatch({ type: "ANSWER", guessAuthentic })}
            onPause={() => dispatch({ type: "APP_BACKGROUND" })}
          />
        )}
        {state.stage === STAGES.RESULT && (
          <Result
            correct={state.lastCorrect === true}
            onReview={() => dispatch({ type: "OPEN_REVIEW" })}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.REVIEW && card && (
          <Review
            card={card}
            reportStatus={state.reportStatus}
            reportBusy={reportBusy}
            onReport={report}
            onContinue={() => dispatch({ type: "NEXT_ROUND" })}
          />
        )}
        {state.stage === STAGES.PRIVATE_SHUTTER && (
          <PrivateShutter onReady={() => dispatch({ type: "REVEAL_PRIVATE_TURN" })} />
        )}
        {state.stage === STAGES.PAUSED && (
          <Paused onResume={() => dispatch({ type: "RESUME_ROOM" })} />
        )}
        {state.stage === STAGES.CONTENT_UNAVAILABLE && <ContentUnavailable fault={state.fault} />}
      </View>
    </SafeAreaView>
  );
}

function Header({ score, concealScore, onHome }: { score: number; concealScore: boolean; onHome: () => void }) {
  return (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to home" onPress={onHome} hitSlop={12}>
        <Text style={s.brand}>SAID THAT?</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={s.score}>{concealScore ? "PRIVATE HANDOFF" : `ROOM SCORE · ${score}`}</Text>
    </View>
  );
}

function Home({ onStart, localFixtures }: { onStart: () => void; localFixtures: boolean }) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>ONE PHONE · REAL OR FAKE</Text>
      <Text style={s.title}>Read the room.{"\n"}Trust the reveal.</Text>
      <Text style={s.copy}>A local, tap-only party game about public voice—not a social feed.</Text>
      <PrimaryButton label="Start a room" onPress={onStart} />
      <Text style={s.note}>No account. No live social feed. No telemetry.</Text>
      {localFixtures && <Text style={s.fixture}>LOCAL DEVELOPMENT FIXTURES · NOT EDITORIAL CONTENT</Text>}
    </View>
  );
}

function Setup({
  mode,
  accessRole,
  onMode,
  onRole,
  onStart,
}: {
  mode: string;
  accessRole: string;
  onMode: (mode: string) => void;
  onRole: (role: string) => void;
  onStart: () => void;
}) {
  const roomBeacon = mode === MODES.ROOM_BEACON;
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>CHOOSE THE RITUAL</Text>
      <Text style={s.title}>How is the room playing?</Text>
      <Choice active={roomBeacon} title="Room Beacon" body="Group reads. Holder makes one tap-only group answer." onPress={() => onMode(MODES.ROOM_BEACON)} />
      <Choice active={!roomBeacon} title="Private Relay" body="One player reads and answers. A shutter protects every handoff." onPress={() => onMode(MODES.PRIVATE_RELAY)} />
      <Text style={s.sectionLabel}>{roomBeacon ? "ACCESS ROLE" : "PRIVATE PLAY"}</Text>
      {roomBeacon ? (
        <>
          <Choice active={accessRole === "holder"} title="I am holding the phone" body="The active prompt is hidden from VoiceOver and TalkBack." onPress={() => onRole("holder")} />
          <Choice active={accessRole === "screen-facing"} title="I am screen-facing" body="I can read the prompt aloud and contribute to the group." onPress={() => onRole("screen-facing")} />
        </>
      ) : (
        <Text style={s.copy}>Tap-only, untimed play. The active player may use VoiceOver or TalkBack; no content is shown during handoff.</Text>
      )}
      <Text style={s.note}>Untimed by design. Controls are at least 56 dp and never depend on motion, audio, or haptics.</Text>
      <PrimaryButton label="Begin round" onPress={onStart} />
    </ScrollView>
  );
}

function Round({
  card,
  mode,
  round,
  hideCardFromAssistiveTech,
  onAnswer,
  onPause,
}: {
  card: { quote: string; person: string };
  mode: string;
  round: number;
  hideCardFromAssistiveTech: boolean;
  onAnswer: (guessAuthentic: boolean) => void;
  onPause: () => void;
}) {
  const roomBeacon = mode === MODES.ROOM_BEACON;
  return (
    <View style={s.round}>
      <Text style={s.mode}>{roomBeacon ? "ROOM BEACON" : "PRIVATE RELAY"} · ROUND {round}</Text>
      <View style={s.beacon}><Text style={s.game}>THIS IS A GAME PROMPT · THE REVEAL DECIDES TRUTH</Text></View>
      <ScrollView
        contentContainerStyle={s.card}
        accessibilityElementsHidden={hideCardFromAssistiveTech}
        importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
      >
        <Text style={s.quote}>“{card.quote}”</Text>
        <Text style={s.person}>— {card.person}</Text>
      </ScrollView>
      <Text style={s.instruction}>{roomBeacon ? "The group decides. The holder taps exactly one answer." : "Read privately, then make exactly one answer."}</Text>
      <View style={s.actions}>
        <PrimaryButton label="They did" onPress={() => onAnswer(true)} />
        <PrimaryButton label="Made for game" secondary onPress={() => onAnswer(false)} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pause session" onPress={onPause}><Text style={s.link}>Pause and leave safely</Text></Pressable>
    </View>
  );
}

function Result({ correct, onReview, onContinue }: { correct: boolean; onReview: () => void; onContinue: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>{correct ? "CORRECT" : "NOT THIS TIME"}</Text>
      <Text style={s.title}>{correct ? "+100 to the room" : "The truth is next."}</Text>
      <PrimaryButton label="See the truth" onPress={onReview} />
      <PrimaryButton label="Continue without review" secondary onPress={onContinue} />
    </View>
  );
}

function Review({
  card,
  reportStatus,
  reportBusy,
  onReport,
  onContinue,
}: {
  card: { authentic: boolean; quote: string; explanation: string; contentState: string };
  reportStatus: string | null;
  reportBusy: boolean;
  onReport: (reason: string) => void;
  onContinue: () => void;
}) {
  const truth = card.contentState === "fixture-authentic" ? "SIMULATED AUTHENTIC FIXTURE" : card.authentic ? "AUTHENTIC" : "FABRICATED FOR THIS GAME";
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>{truth}</Text>
      <Text style={s.title}>“{card.quote}”</Text>
      <Text style={s.copy}>{card.explanation}</Text>
      <Text style={s.note}>Source status: {card.contentState === "fixture-authentic" ? "development simulation — not a source-verified production card" : card.authentic ? "editorial source record required" : "game fixture"}.</Text>
      <View style={s.report}>
        <Text style={s.sectionLabel}>SEE A CONTENT ISSUE?</Text>
        <Text style={s.note}>Reports save locally with only card ID, reason, deck version, and timestamp. No player identity or free text is collected.</Text>
        <PrimaryButton label={reportBusy ? "Queuing report…" : "Report wrong attribution"} secondary onPress={() => onReport("wrong-attribution")} disabled={reportBusy} />
        <PrimaryButton label="Report harmful content" secondary onPress={() => onReport("harmful-content")} disabled={reportBusy} />
        <PrimaryButton label="Report another issue" secondary onPress={() => onReport("other")} disabled={reportBusy} />
        {reportStatus === "queued" && <Text accessibilityLiveRegion="polite" style={s.success}>Saved locally. It will remain queued until a reviewed delivery path exists.</Text>}
        {reportStatus === "failed" && <Text accessibilityLiveRegion="polite" style={s.error}>Could not save the report. Your game can continue safely.</Text>}
      </View>
      <PrimaryButton label="Next prompt" onPress={onContinue} />
    </ScrollView>
  );
}

function PrivateShutter({ onReady }: { onReady: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>PRIVATE RELAY</Text>
      <Text style={s.title}>Pass the phone.</Text>
      <Text style={s.copy}>The prior prompt and result are protected. If the app was interrupted, that private turn was discarded rather than shown to the next person.</Text>
      <PrimaryButton label="I have the phone — reveal my turn" onPress={onReady} />
    </View>
  );
}

function Paused({ onResume }: { onResume: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>SESSION PAUSED</Text>
      <Text style={s.title}>Nothing was submitted.</Text>
      <Text style={s.copy}>Resume when the same room is ready. The round and score remain intact.</Text>
      <PrimaryButton label="Resume safely" onPress={onResume} />
    </View>
  );
}

function ContentUnavailable({ fault }: { fault: string | null }) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>CONTENT PAUSED</Text>
      <Text style={s.title}>This deck is not safe to play.</Text>
      <Text style={s.copy}>{fault === "corrupt-deck" ? "The deck failed an integrity check." : "No reviewed, playable content is available on this device."}</Text>
      <Text style={s.note}>Disputed, removed, and source-unavailable records are never used as binary game prompts.</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} style={[s.button, secondary && s.secondary, disabled && s.disabled]} onPress={onPress}><Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text></Pressable>;
}

function Choice({ active, title, body, onPress }: { active: boolean; title: string; body: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={[s.choice, active && s.choiceActive]}><Text style={s.choiceTitle}>{title}</Text><Text style={s.choiceBody}>{body}</Text></Pressable>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.canvas },
  app: { flex: 1, padding: t.spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", paddingTop: t.spacing.xs },
  brand: { color: t.color.text.primary, fontWeight: t.typography.weight.bold, letterSpacing: 1.5 },
  score: { color: t.color.signal, fontSize: t.typography.size.beacon, fontWeight: t.typography.weight.bold },
  center: { flex: 1, justifyContent: "center", gap: t.spacing.sm },
  setup: { flexGrow: 1, justifyContent: "center", gap: t.spacing.sm, paddingVertical: t.spacing.md + t.spacing.xs },
  eyebrow: { color: t.color.signal, fontSize: t.typography.size.beacon, fontWeight: t.typography.weight.bold, letterSpacing: 1.4 },
  title: { color: t.color.text.primary, fontSize: t.typography.size.statement + 6, fontWeight: t.typography.weight.bold, lineHeight: t.typography.size.statement + 11 },
  copy: { color: t.color.text.muted, fontSize: t.typography.size.body, lineHeight: t.typography.size.body + 6 },
  note: { color: t.color.text.muted, fontSize: t.typography.size.beacon + 2, lineHeight: t.typography.size.beacon + 8 },
  fixture: { color: t.color.status.warning, fontSize: t.typography.size.beacon, fontWeight: t.typography.weight.bold, letterSpacing: 0.8 },
  button: { backgroundColor: t.color.action.primary, minHeight: t.target.minimum, justifyContent: "center", alignItems: "center", paddingHorizontal: t.spacing.sm + 2, borderRadius: t.radius.control },
  buttonText: { color: t.color.canvas, fontSize: t.typography.size.body, fontWeight: t.typography.weight.bold, textAlign: "center" },
  secondary: { backgroundColor: "transparent", borderWidth: 2, borderColor: t.color.text.primary },
  secondaryText: { color: t.color.text.primary },
  disabled: { opacity: 0.55 },
  link: { color: t.color.text.primary, textAlign: "center", fontWeight: t.typography.weight.semibold, padding: t.spacing.xs + 2 },
  choice: { borderWidth: 2, borderColor: t.color.action.secondary, padding: t.spacing.sm + 2, borderRadius: t.radius.control, gap: 6 },
  choiceActive: { borderColor: t.color.signal, backgroundColor: t.color.surface },
  choiceTitle: { color: t.color.text.primary, fontSize: t.typography.size.body + 3, fontWeight: t.typography.weight.bold },
  choiceBody: { color: t.color.text.muted, fontSize: t.typography.size.body - 3, lineHeight: t.typography.size.body + 3 },
  sectionLabel: { color: t.color.signal, fontSize: t.typography.size.beacon + 1, fontWeight: t.typography.weight.bold, letterSpacing: 1 },
  round: { flex: 1, paddingTop: t.spacing.lg - 4, gap: t.spacing.sm },
  mode: { color: t.color.signal, fontWeight: t.typography.weight.bold, letterSpacing: 1 },
  beacon: { borderTopWidth: 4, borderBottomWidth: 4, borderColor: t.color.signal, paddingVertical: t.spacing.xs },
  game: { color: t.color.text.primary, fontWeight: t.typography.weight.bold, letterSpacing: 1, textAlign: "center", fontSize: t.typography.size.beacon },
  card: { flexGrow: 1, justifyContent: "center", gap: t.spacing.sm },
  quote: { color: t.color.text.primary, fontSize: t.typography.size.statement + 4, fontWeight: t.typography.weight.bold, lineHeight: t.typography.size.statement + 11 },
  person: { color: t.color.text.muted, fontSize: t.typography.size.body + 2, fontWeight: t.typography.weight.semibold },
  instruction: { color: t.color.text.muted, fontSize: t.typography.size.body - 2, lineHeight: t.typography.size.body + 4 },
  actions: { gap: t.spacing.sm - 4 },
  report: { borderTopWidth: 1, borderColor: t.color.action.secondary, paddingTop: t.spacing.sm + 2, gap: t.spacing.sm - 4 },
  success: { color: t.color.status.safe, fontSize: t.typography.size.beacon + 2, lineHeight: t.typography.size.beacon + 8 },
  error: { color: t.color.status.danger, fontSize: t.typography.size.beacon + 2, lineHeight: t.typography.size.beacon + 8 },
});
