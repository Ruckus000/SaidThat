import { Pressable, Text, View } from "react-native";

import { headerScoreLabel, streakBadgeLabel } from "./presentationLabels";
import { Icon } from "./Icon";
import { StreakSparks } from "./StreakSparks";
import { s } from "./styles";

export type HeaderProps = {
  score: number;
  streak: number;
  reducedMotion: boolean;
  onHome: () => void;
  onSettings?: () => void;
};

/**
 * The wordmark row: home, the score or streak pill, and settings.
 *
 * There was a spring "pop" on the score pill here, driven by an effect comparing
 * the score against a ref. It could never run. The score changes in exactly one
 * place — the ANSWER case, which requires stage ROUND — and this header renders
 * at neither ROUND nor RESULT; App excludes both, along with RECAP,
 * PRIVATE_SHUTTER and PAUSED. So the component is unmounted across the only
 * transition that raises the score, and on remount `prevScore` re-seeds to the
 * current value, leaving `increased` false forever.
 *
 * `reducedMotion` stays in the props even though nothing here animates now. Every
 * screen takes it, App passes it uniformly, and removing it would make this one
 * component's signature the odd one out for no gain.
 */
export function Header({ score, streak, onHome, onSettings }: HeaderProps) {
  const badge = streakBadgeLabel(streak);
  const scoreLabel = headerScoreLabel(score);

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
          <View style={[s.scorePill, s.scorePillHot, s.pillRow]}>
            <StreakSparks count={1} />
            <Text accessibilityLiveRegion="polite" style={[s.score, s.scoreHot]}>
              {badge}
            </Text>
          </View>
        ) : (
          <View style={s.scorePill}>
            <Text accessibilityLiveRegion="polite" style={s.score}>
              {scoreLabel}
            </Text>
          </View>
        )}
        {onSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={onSettings}
            style={s.gear}
            hitSlop={8}
          >
            <Icon name="gear" size={17} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
