import { Pressable, ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { hotmic } from "../theme/tokens";
import { roundInstruction, roundModeLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type RoundCard = {
  quote: string;
  person: string;
};

export type RoundScreenProps = {
  card: RoundCard;
  mode: string;
  round: number;
  hideCardFromAssistiveTech: boolean;
  motionOptIn: boolean;
  motionCalibrated: boolean;
  reducedMotion: boolean;
  onCalibrate: () => void;
  onAnswer: (guessAuthentic: boolean) => void;
  onPause: () => void;
};

function AnswerButton({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      onPress={onPress}
      android_ripple={{ color: "rgba(200,255,61,0.15)" }}
      style={({ pressed }) => [s.answer, pressed && s.pressed]}
    >
      <Text style={s.answerText}>{label}</Text>
      <Text style={s.answerHint}>{hint}</Text>
    </Pressable>
  );
}

export function RoundScreen({
  card,
  mode,
  round,
  hideCardFromAssistiveTech,
  motionOptIn,
  motionCalibrated,
  reducedMotion,
  onCalibrate,
  onAnswer,
  onPause,
}: RoundScreenProps) {
  return (
    <View style={s.round}>
      <Text style={s.mode}>{roundModeLabel(mode, round)}</Text>
      <View style={s.beacon}><Text style={s.game}>THIS IS A GAME PROMPT · THE REVEAL DECIDES TRUTH</Text></View>
      <FadeIn key={round} reducedMotion={reducedMotion} style={s.cardFill}>
        <ScrollView
          contentContainerStyle={s.card}
          accessibilityElementsHidden={hideCardFromAssistiveTech}
          importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
        >
          <View style={s.markBeacon}>
            <Mark name="open" size={56} color={hotmic.color.dark.marigold} />
          </View>
          <Text style={s.quote}>{card.quote}</Text>
          <Text style={s.person}>— {card.person}</Text>
        </ScrollView>
      </FadeIn>
      <Text style={s.instruction}>{roundInstruction(mode)}</Text>
      {motionOptIn && mode === MODES.ROOM_BEACON && (
        <>
          <Text style={s.note}>
            {motionCalibrated
              ? "Tilt is active for the holder. Tap answers still commit exactly once."
              : "Hold the phone level, then calibrate before using tilt."}
          </Text>
          {!motionCalibrated && (
            <PrimaryButton label="Calibrate neutral tilt" secondary onPress={onCalibrate} />
          )}
        </>
      )}
      <View style={s.answers}>
        <AnswerButton label="They really said it" hint="Authentic" onPress={() => onAnswer(true)} />
        <AnswerButton label="Faked for the game" hint="Fabricated" onPress={() => onAnswer(false)} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pause session"
        onPress={onPause}
        style={s.pauseTap}
      >
        <Text style={s.link}>Pause</Text>
      </Pressable>
    </View>
  );
}
