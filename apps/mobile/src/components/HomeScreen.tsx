import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { volt } from "../theme/tokens";
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

// Separator is the app's own middot idiom (ROOM · 0, THIS RUN · …) rather than a
// dingbat character — the spark is drawn as SVG wherever it carries meaning.
const TICKER = "REAL OR FAKE · REAL OR FAKE · REAL OR FAKE · REAL OR FAKE · ";

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
  // The strip renders TICKER twice, so travelling exactly half its measured width
  // lands the second copy where the first began — no visible seam on loop. Measured
  // rather than hard-coded because the width depends on the loaded face.
  const [tickerWidth, setTickerWidth] = useState(0);

  useEffect(() => {
    if (reducedMotion || !tickerWidth) return;
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
  }, [reducedMotion, tickerX, tickerWidth]);

  return (
    <FadeIn reducedMotion={reducedMotion} style={s.home}>
      <View style={s.homeHero}>
        <View style={s.homeMark} pointerEvents="none">
          <Mark name="open" size={300} color={volt.color.dark.lime} decorative />
        </View>
        <Text style={s.eyebrowPink}>REAL QUOTES.</Text>
        <Text style={s.eyebrowLime}>TOTAL LIES.</Text>
        <Text style={s.heroTitle}>{"SAID\nTHAT?"}</Text>
        <Text style={s.copy}>One phone. One room. Call the bluff before the reveal burns you.</Text>
        {summary && <Text style={s.runSummary}>{summary}</Text>}
      </View>

      <View style={s.tickerWrap}>
        {/*
          Measured off-screen inside a deliberately over-wide box: a Text always
          lays out against the width available to it, so measuring it in place
          would either wrap (no numberOfLines) or clip (numberOfLines={1}) and
          report the gutter width instead of the string's true width.
        */}
        <View style={s.tickerMeasure} pointerEvents="none">
          <Text
            numberOfLines={1}
            style={s.tickerText}
            onLayout={(e) => setTickerWidth(e.nativeEvent.layout.width)}
          >
            {TICKER}
          </Text>
        </View>
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            s.tickerTrack,
            !reducedMotion && {
              transform: [
                {
                  translateX: tickerX.interpolate({
                    inputRange: [-1, 0],
                    outputRange: [-tickerWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Two copies at exactly the measured width, so travelling one width
              lands the second where the first began — no seam on loop. */}
          <Text numberOfLines={1} style={[s.tickerText, { width: tickerWidth }]}>
            {TICKER}
          </Text>
          <Text numberOfLines={1} style={[s.tickerText, { width: tickerWidth }]}>
            {TICKER}
          </Text>
        </Animated.View>
      </View>

      <View style={s.homeFooter}>
        <PrimaryButton label="START A ROOM" hero onPress={onStart} />
        <Text style={s.homeFootnote}>No accounts · no feed · everything stays on this phone</Text>
        {localFixtures && <Text style={s.fixture}>{FIXTURE_DISCLOSURE}</Text>}
      </View>
    </FadeIn>
  );
}
