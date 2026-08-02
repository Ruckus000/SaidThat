import { Animated, Pressable, ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { useFireEvent } from "../feedback/useFireEvent";
import { volt } from "../theme/tokens";
import {
  calibrationHint,
  headerScoreLabel,
  roundInstruction,
  roundModeLabel,
  streakBadgeLabel,
} from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { StreakSparks } from "./StreakSparks";
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
  score: number;
  streak: number;
  hideCardFromAssistiveTech: boolean;
  motionOptIn: boolean;
  motionCalibrated: boolean;
  /** A calibration read is in flight; the control is inert until it settles. */
  calibrationReading?: boolean;
  /** The bounded read came back with nothing — no sensor, denied, or wedged. */
  calibrationUnavailable?: boolean;
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
  score,
  streak,
  hideCardFromAssistiveTech,
  motionOptIn,
  motionCalibrated,
  calibrationReading = false,
  calibrationUnavailable = false,
  reducedMotion,
  haptics,
  onCalibrate,
  onAnswer,
  onPause,
}: RoundScreenProps) {
  const compact = card.quote.length > 60;
  // The round stage owns its own context row instead of the shared wordmark header:
  // the round count on the left, and on the right a lit streak badge once a streak is
  // running, otherwise the plain score. Both are words first — the lime is additive.
  const badge = streakBadgeLabel(streak);
  return (
    <View style={s.round}>
      <View style={s.roundTop}>
        <View style={s.roundPill}>
          <Text style={s.roundPillText}>{roundModeLabel(mode, round, totalRounds)}</Text>
        </View>
        <View style={[s.roundPill, s.pillRow, badge && s.roundPillHot]}>
          {badge && <StreakSparks count={1} />}
          <Text
            accessibilityLiveRegion="polite"
            style={[s.roundPillTextMuted, badge && s.roundPillTextHot]}
          >
            {badge ?? headerScoreLabel(score)}
          </Text>
        </View>
      </View>

      {/*
        The prompt scrolls; the answers below do not. One ScrollView, not two —
        the card used to hold its own, which nested two vertical scrollers and hid
        the failure: when the card's height collapsed, the inner scroller simply
        had a near-zero viewport and the quote was gone with nothing to drag.
      */}
      <ScrollView contentContainerStyle={s.roundScroll}>
        <FadeIn key={round} reducedMotion={reducedMotion} style={s.promptCard}>
          <Text style={s.promptBeacon}>GAME PROMPT · THE REVEAL DECIDES</Text>
          <View
            style={s.card}
            accessibilityElementsHidden={hideCardFromAssistiveTech}
            importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
          >
            <Mark name="open" size={56} color={volt.color.dark.lime} />
            <Text style={[s.quote, compact && s.quoteCompact]}>{card.quote}</Text>
            <Text style={s.person}>— {card.person}</Text>
          </View>
        </FadeIn>

        <Text style={s.instruction}>{roundInstruction(mode)}</Text>
        {motionOptIn && mode === MODES.ROOM_BEACON && (
          <>
            <Text accessibilityLiveRegion="polite" style={s.note}>
              {calibrationHint({
                calibrated: motionCalibrated,
                reading: calibrationReading,
                unavailable: calibrationUnavailable,
              })}
            </Text>
            {!motionCalibrated && (
              <PrimaryButton
                label={calibrationUnavailable ? "Try calibrating again" : "Calibrate neutral tilt"}
                secondary
                disabled={calibrationReading}
                onPress={onCalibrate}
              />
            )}
          </>
        )}
      </ScrollView>

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
