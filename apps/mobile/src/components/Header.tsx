import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

import { headerScoreLabel, streakBadgeLabel } from "./presentationLabels";
import { s } from "./styles";

export type HeaderProps = {
  score: number;
  streak: number;
  concealScore: boolean;
  reducedMotion: boolean;
  onHome: () => void;
};

export function Header({ score, streak, concealScore, reducedMotion, onHome }: HeaderProps) {
  const pop = useRef(new Animated.Value(1)).current;
  const prevScore = useRef(score);

  useEffect(() => {
    const increased = score > prevScore.current;
    prevScore.current = score;
    if (!increased || concealScore || reducedMotion) return;
    pop.setValue(1);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  }, [score, concealScore, reducedMotion, pop]);

  const badge = concealScore ? null : streakBadgeLabel(streak);

  return (
    <View style={s.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to home"
        onPress={onHome}
        hitSlop={16}
        style={{ justifyContent: "center", minHeight: 56 }}
      >
        <Text style={s.brand}>SAID THAT?</Text>
      </Pressable>
      <View style={s.scoreWrap}>
        <Animated.Text
          accessibilityLiveRegion="polite"
          style={[s.score, { transform: [{ scale: pop }] }]}
        >
          {headerScoreLabel({ score, concealScore })}
        </Animated.Text>
        {badge && <Text style={s.streakBadge}>{badge}</Text>}
      </View>
    </View>
  );
}
