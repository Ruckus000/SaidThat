import { ScrollView, Text, View } from "react-native";

import { accuracyPercent, recapStatLines, runRankLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { PrimaryButton } from "./PrimaryButton";
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
        <Text style={s.eyebrow}>RUN COMPLETE</Text>
        <Text style={s.recapRank}>{rank}</Text>
        <Text style={s.copy}>How the room read this run.</Text>
        <View style={s.statBlock}>
          {stats.map((stat) => (
            <View key={stat.label} style={s.statRow}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </FadeIn>
      <PrimaryButton label="Play again" onPress={onPlayAgain} />
      <PrimaryButton label="Back home" secondary onPress={onHome} />
    </ScrollView>
  );
}
