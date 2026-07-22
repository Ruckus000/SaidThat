import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

import { revealFeedback } from "../feedback/haptics";
import { resultHeadline, resultMark, resultRewardLabel } from "./presentationLabels";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ResultScreenProps = {
  correct: boolean;
  streak: number;
  reducedMotion: boolean;
  haptics: boolean;
  onReview: () => void;
  onContinue: () => void;
};

const SUSPENSE_MS = 850;

export function ResultScreen({ correct, streak, reducedMotion, haptics, onReview, onContinue }: ResultScreenProps) {
  // Post-commit anticipation beat: the tap is already registered, so this never
  // makes tap-play second-class and adds no answer countdown. Reduced motion
  // skips straight to the verdict with the identical words and reward.
  const [revealed, setRevealed] = useState(reducedMotion);
  const reveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

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
      Animated.spring(reveal, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
    }, SUSPENSE_MS);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [reducedMotion, reveal, pulse]);

  // Fire the reveal haptic exactly when the verdict lands — on mount under reduced
  // motion (revealed starts true), or when the suspense beat flips it true.
  useEffect(() => {
    if (revealed) revealFeedback(haptics);
  }, [revealed, haptics]);

  if (!revealed) {
    return (
      <View style={s.center}>
        <Animated.Text style={[s.suspense, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]}>
          LOCKING IT IN…
        </Animated.Text>
        <Text style={s.copy}>The room leans in.</Text>
      </View>
    );
  }

  return (
    <View style={s.center}>
      <Animated.View style={{ opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
        <Text style={s.resultMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {resultMark(correct)}
        </Text>
        <Text style={s.eyebrow}>{resultHeadline(correct)}</Text>
        <Text style={correct ? s.reward : s.copy}>{resultRewardLabel(correct, streak)}</Text>
      </Animated.View>
      <PrimaryButton label="See the truth" onPress={onReview} />
      <PrimaryButton label="Keep playing" secondary onPress={onContinue} />
    </View>
  );
}
