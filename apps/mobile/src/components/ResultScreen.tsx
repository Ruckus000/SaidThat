import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

import { revealFeedback } from "../feedback/haptics";
import { volt } from "../theme/tokens";
import {
  continueLabel,
  resultHeadline,
  resultKicker,
  resultMarkName,
  resultRewardLabel,
  resultStreakLabel,
  streakSparkCount,
} from "./presentationLabels";
import { Mark } from "./Mark";
import { StreakSparks } from "./StreakSparks";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ResultScreenProps = {
  correct: boolean;
  streak: number;
  roundIndex: number;
  totalRounds: number;
  reducedMotion: boolean;
  haptics: boolean;
  onReview: () => void;
  onContinue: () => void;
};

const SUSPENSE_MS = volt.motion.durations.locking;

export function ResultScreen({
  correct,
  streak,
  roundIndex,
  totalRounds,
  reducedMotion,
  haptics,
  onReview,
  onContinue,
}: ResultScreenProps) {
  // Post-commit anticipation beat: the tap is already registered, so this never
  // makes tap-play second-class and adds no answer countdown. Reduced motion
  // skips straight to the verdict with the identical words and reward.
  const [revealed, setRevealed] = useState(reducedMotion);
  const stamp = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const next = continueLabel({ roundIndex, totalRounds });
  const streakLine = resultStreakLabel(streak);

  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    const timer = setTimeout(() => {
      loop.stop();
      setRevealed(true);
      Animated.spring(stamp, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }, SUSPENSE_MS);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [reducedMotion, stamp, pulse]);

  useEffect(() => {
    if (revealed) revealFeedback(haptics);
  }, [revealed, haptics]);

  if (!revealed) {
    return (
      <View style={s.lockingWrap}>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }}>
          <Mark name="selectionDot" size={44} color={volt.color.dark.lime} />
        </Animated.View>
        <Animated.Text
          style={[
            s.suspense,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
          ]}
        >
          LOCKING IT IN…
        </Animated.Text>
        <Text style={s.copy}>The room leans in.</Text>
      </View>
    );
  }

  const flashStyle = correct ? s.resultFlashHit : s.resultFlashMiss;

  return (
    <View style={[s.resultFlash, flashStyle]}>
      <View style={s.resultBody}>
        <Animated.View
          style={{
            opacity: stamp,
            transform: [
              { translateY: stamp.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            ],
          }}
        >
          <Mark name={resultMarkName(correct)} size={72} color={volt.color.dark.onHero} />
        </Animated.View>
        <Text style={s.resultKicker}>{resultKicker(correct)}</Text>
        <Animated.Text
          style={[
            s.verdict,
            {
              transform: [
                {
                  scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }),
                },
                {
                  rotate: stamp.interpolate({
                    inputRange: [0, 1],
                    outputRange: correct ? ["-10deg", "-3deg"] : ["8deg", "2deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {resultHeadline(correct).replace(" ", "\n")}
        </Animated.Text>
        {correct ? (
          <Text style={s.reward}>{resultRewardLabel(correct, streak)}</Text>
        ) : (
          <Text style={s.rewardMiss}>{resultRewardLabel(correct, streak)}</Text>
        )}
        {correct && streakLine && (
          <View style={[s.streakPill, s.pillRow]}>
            <StreakSparks
              count={streakSparkCount(streak)}
              size={14}
              color={volt.color.dark.onHero}
            />
            <Text style={s.streakPillText}>{streakLine}</Text>
          </View>
        )}
      </View>
      <View style={s.resultActions}>
        <PrimaryButton
          label="SEE THE TRUTH"
          onFlash
          onFlashMiss={!correct}
          onPress={onReview}
        />
        <PrimaryButton label={next} outlineOnFlash onPress={onContinue} />
      </View>
    </View>
  );
}
