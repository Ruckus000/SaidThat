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
  totalRounds: number;
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
  variant,
  haptics,
  reducedMotion,
  onPress,
}: {
  label: string;
  hint: string;
  variant: "real" | "fake";
  haptics: boolean;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, pressableProps } = useFireEvent("answerCommit", { onPress, haptics, reducedMotion });
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hint}`}
        android_ripple={{ color: "rgba(11,14,19,0.18)" }}
        style={({ pressed }) => [
          s.answer,
          variant === "real" ? s.answerReal : s.answerFake,
          pressed && s.pressed,
        ]}
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
  totalRounds,
  hideCardFromAssistiveTech,
  motionOptIn,
  motionCalibrated,
  reducedMotion,
  haptics,
  onCalibrate,
  onAnswer,
  onPause,
}: RoundScreenProps) {
  const compact = card.quote.length > 60;
  return (
    <View style={s.round}>
      <View style={s.roundTop}>
        <View style={s.roundPill}>
          <Text style={s.roundPillText}>{roundModeLabel(mode, round, totalRounds)}</Text>
        </View>
      </View>

      <FadeIn key={round} reducedMotion={reducedMotion} style={s.promptCard}>
        <Text style={s.promptBeacon}>GAME PROMPT · THE REVEAL DECIDES</Text>
        <ScrollView
          contentContainerStyle={s.card}
          accessibilityElementsHidden={hideCardFromAssistiveTech}
          importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
        >
          <Mark name="open" size={56} color={hotmic.color.dark.lime} />
          <Text style={[s.quote, compact && s.quoteCompact]}>{card.quote}</Text>
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
        <AnswerButton
          label="SAID IT"
          hint="it's real"
          variant="real"
          haptics={haptics}
          reducedMotion={reducedMotion}
          onPress={() => onAnswer(true)}
        />
        <AnswerButton
          label="TOTAL LIE"
          hint="made for the game"
          variant="fake"
          haptics={haptics}
          reducedMotion={reducedMotion}
          onPress={() => onAnswer(false)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pause and leave safely"
        onPress={onPause}
        style={s.pauseTap}
      >
        <Text style={s.link}>Pause and leave safely</Text>
      </Pressable>
    </View>
  );
}
