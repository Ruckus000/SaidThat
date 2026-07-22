import { Text } from "react-native";

import { FIXTURE_DISCLOSURE, runSummaryLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type HomeScreenProps = {
  onStart: () => void;
  onOpenSettings: () => void;
  localFixtures: boolean;
  reducedMotion: boolean;
  roundsPlayed: number;
  correctCount: number;
  bestStreak: number;
};

export function HomeScreen({
  onStart,
  onOpenSettings,
  localFixtures,
  reducedMotion,
  roundsPlayed,
  correctCount,
  bestStreak,
}: HomeScreenProps) {
  const summary = runSummaryLabel({ roundsPlayed, correctCount, bestStreak });
  return (
    <FadeIn reducedMotion={reducedMotion} style={s.center}>
      <Text style={s.eyebrow}>REAL OR FAKE · ONE PHONE</Text>
      <Text style={s.title}>Did they really say that?</Text>
      <Text style={s.copy}>Pass the phone, read the room, and call it before the reveal.</Text>
      {summary && <Text style={s.runSummary}>{summary}</Text>}
      <PrimaryButton label="Start a room" onPress={onStart} />
      <PrimaryButton label="Settings" secondary onPress={onOpenSettings} />
      <Text style={s.note}>No account, no live feed, no telemetry — it all stays on this phone.</Text>
      {localFixtures && <Text style={s.fixture}>{FIXTURE_DISCLOSURE}</Text>}
    </FadeIn>
  );
}
