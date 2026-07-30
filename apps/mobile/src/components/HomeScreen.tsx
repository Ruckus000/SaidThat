import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { hotmic } from "../theme/tokens";
import { FIXTURE_DISCLOSURE, runSummaryLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type HomeScreenProps = {
  onStart: () => void;
  localFixtures: boolean;
  reducedMotion: boolean;
  roundsPlayed: number;
  correctCount: number;
  bestStreak: number;
  runComplete: boolean;
};

const TICKER = "REAL OR FAKE ✦ REAL OR FAKE ✦ REAL OR FAKE ✦ REAL OR FAKE ✦ ";

export function HomeScreen({
  onStart,
  localFixtures,
  reducedMotion,
  roundsPlayed,
  correctCount,
  bestStreak,
  runComplete,
}: HomeScreenProps) {
  const summary = runSummaryLabel({ roundsPlayed, correctCount, bestStreak, complete: runComplete });
  const tickerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    tickerX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(tickerX, {
        toValue: -1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, tickerX]);

  return (
    <FadeIn reducedMotion={reducedMotion} style={s.home}>
      <View style={s.homeHero}>
        <View style={s.homeMark} pointerEvents="none">
          <Mark name="open" size={300} color={hotmic.color.dark.lime} decorative />
        </View>
        <Text style={s.eyebrowPink}>REAL QUOTES.</Text>
        <Text style={s.eyebrowLime}>TOTAL LIES.</Text>
        <Text style={s.heroTitle}>{"SAID\nTHAT?"}</Text>
        <Text style={s.copy}>One phone. One room. Call the bluff before the reveal burns you.</Text>
        {summary && <Text style={s.runSummary}>{summary}</Text>}
      </View>

      <View style={s.tickerWrap}>
        <Animated.Text
          numberOfLines={1}
          style={[
            s.tickerText,
            !reducedMotion && {
              transform: [
                {
                  translateX: tickerX.interpolate({
                    inputRange: [-1, 0],
                    outputRange: [-280, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {TICKER}
          {TICKER}
        </Animated.Text>
      </View>

      <View style={s.homeFooter}>
        <PrimaryButton label="START A ROOM" onPress={onStart} />
        <Text style={s.homeFootnote}>No accounts · no feed · everything stays on this phone</Text>
        {localFixtures && <Text style={s.fixture}>{FIXTURE_DISCLOSURE}</Text>}
      </View>
    </FadeIn>
  );
}
