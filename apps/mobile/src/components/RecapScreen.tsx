import { Pressable, ScrollView, Text, View } from "react-native";

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
  /**
   * Cards the run just played, offered for the optional laugh tap. Omitted (or
   * empty) hides the whole section — the recap must still work with no
   * calibration wired up.
   */
  runCards?: { id: string; person: string }[];
  laughPickId?: string | null;
  onPickFunniest?: (cardId: string) => void;
};

export function RecapScreen({
  score,
  correctCount,
  roundsPlayed,
  bestStreak,
  reducedMotion,
  onPlayAgain,
  onHome,
  runCards = [],
  laughPickId = null,
  onPickFunniest,
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
                {stat.spark && <StreakSparks count={1} size={16} />}
                <Text style={[s.statValue, stat.spark && s.statValueHot]}>{stat.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>
      {/*
        The laugh signal. One optional tap per run, room-level — which card got
        the biggest reaction, not who reacted. It is the only way "is this deck
        actually funny" gets measured rather than asserted, and it needs no
        microphone and no identity to do it. Idempotent: tapping again just
        moves the pick.
      */}
      {onPickFunniest && runCards.length > 0 ? (
        <View style={s.report}>
          <Text style={s.sectionLabel}>WHICH ONE GOT THE BIGGEST REACTION?</Text>
          <Text style={s.note}>Optional, and stays on this device.</Text>
          <View style={s.reportChips}>
            {runCards.map((runCard) => {
              const selected = laughPickId === runCard.id;
              return (
                <Pressable
                  key={runCard.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Biggest reaction: ${runCard.person}`}
                  onPress={() => onPickFunniest(runCard.id)}
                  style={[s.reportChip, selected && s.reportChipSelected]}
                >
                  <Text style={[s.reportChipText, selected && s.reportChipTextSelected]}>
                    {runCard.person}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={{ flex: 1, minHeight: 16 }} />
      <PrimaryButton label="RUN IT BACK" hero onPress={onPlayAgain} />
      <PrimaryButton label="BACK HOME" secondary onPress={onHome} />
    </ScrollView>
  );
}
