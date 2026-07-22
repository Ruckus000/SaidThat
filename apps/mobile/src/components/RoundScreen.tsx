import { Animated, Pressable, ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { useFireEvent } from "../feedback/useFireEvent";
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
  haptics: boolean;
  onCalibrate: () => void;
  onAnswer: (guessAuthentic: boolean) => void;
  onPause: () => void;
};

function AnswerButton({
  label,
  hint,
  haptics,
  reducedMotion,
  onPress,
}: {
  label: string;
  hint: string;
  haptics: boolean;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  // The KICK: identical for both answers (dip -> overshoot -> settle + haptic doublet),
  // so the felt commit never differs between the two verdicts.
  const { animatedStyle, pressableProps } = useFireEvent("answerCommit", { onPress, haptics, reducedMotion });
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hint}`}
        android_ripple={{ color: "rgba(255,176,32,0.12)" }}
        style={({ pressed }) => [s.answer, pressed && s.pressed]}
        {...pressableProps}
      >
        <Text style={s.answerText}>{label}</Text>
        <Text style={s.answerHint}>{hint}</Text>
      </Pressable>
    </Animated.View>
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
  haptics,
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
        <AnswerButton label="They really said it" hint="Authentic" haptics={haptics} reducedMotion={reducedMotion} onPress={() => onAnswer(true)} />
        <AnswerButton label="Faked for the game" hint="Fabricated" haptics={haptics} reducedMotion={reducedMotion} onPress={() => onAnswer(false)} />
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
