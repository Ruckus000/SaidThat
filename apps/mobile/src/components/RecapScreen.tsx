import { ScrollView, Text, View } from "react-native";

import { volt } from "../theme/tokens";
import { accuracyPercent, recapStatLines, runRankLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { StreakSparks } from "./StreakSparks";
import { s } from "./styles";

export type RecapScreenProps = {
  score: number;
  correctCount: number;
  roundsPlayed: number;
  bestStreak: number;
  reducedMotion: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
};

export function RecapScreen({
  score,
  correctCount,
  roundsPlayed,
  bestStreak,
  reducedMotion,
  onPlayAgain,
  onHome,
}: RecapScreenProps) {
  const rank = runRankLabel(accuracyPercent(correctCount, roundsPlayed));
  const stats = recapStatLines({ score, correctCount, roundsPlayed, bestStreak });
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <FadeIn reducedMotion={reducedMotion} offset={14}>
        <Mark name="spark" size={64} color={volt.color.dark.lime} />
        <Text style={s.eyebrowPink}>RUN COMPLETE</Text>
        <Text style={s.recapRank}>{rank}</Text>
        <Text style={s.copy}>How the room read this run.</Text>
        <View style={s.statBlock}>
          {stats.map((stat) => (
            <View key={stat.label} style={s.statRow}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <View style={s.pillRow}>
                {stat.spark && <StreakSparks streak={bestStreak} size={16} single />}
                <Text style={[s.statValue, stat.spark && s.statValueHot]}>{stat.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>
      <View style={{ flex: 1, minHeight: 16 }} />
      <PrimaryButton label="RUN IT BACK" hero onPress={onPlayAgain} />
      <PrimaryButton label="BACK HOME" secondary onPress={onHome} />
    </ScrollView>
  );
}
