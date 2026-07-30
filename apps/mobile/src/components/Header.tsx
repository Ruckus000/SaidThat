import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

import { headerScoreLabel, streakBadgeLabel } from "./presentationLabels";
import { Icon } from "./Icon";
import { StreakSparks } from "./StreakSparks";
import { s } from "./styles";
import { volt } from "../theme/tokens";

export type HeaderProps = {
  score: number;
  streak: number;
  concealScore: boolean;
  reducedMotion: boolean;
  onHome: () => void;
  onSettings?: () => void;
};

export function Header({
  score,
  streak,
  concealScore,
  reducedMotion,
  onHome,
  onSettings,
}: HeaderProps) {
  const pop = useRef(new Animated.Value(1)).current;
  const prevScore = useRef(score);

  useEffect(() => {
    const increased = score > prevScore.current;
    prevScore.current = score;
    if (!increased || concealScore || reducedMotion) return;
    pop.setValue(1);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.12, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  }, [score, concealScore, reducedMotion, pop]);

  const badge = concealScore ? null : streakBadgeLabel(streak);
  const scoreLabel = headerScoreLabel({ score, concealScore });

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
        {badge ? (
          <Animated.View
            style={[s.scorePill, s.scorePillHot, s.pillRow, { transform: [{ scale: pop }] }]}
          >
            <StreakSparks streak={streak} />
            <Text accessibilityLiveRegion="polite" style={[s.score, s.scoreHot]}>
              {badge}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={[s.scorePill, { transform: [{ scale: pop }] }]}>
            <Text accessibilityLiveRegion="polite" style={s.score}>
              {scoreLabel}
            </Text>
          </Animated.View>
        )}
        {onSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={onSettings}
            style={s.gear}
            hitSlop={8}
          >
            <Icon name="gear" size={17} color={volt.color.dark.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
