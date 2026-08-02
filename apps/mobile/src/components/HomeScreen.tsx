import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { volt } from "../theme/tokens";
import { FIXTURE_DISCLOSURE, runSummaryLabel } from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type HomeScreenProps = {
  onStart: () => void;
  /** Outcome of a local reset that could not fully deliver, shown until acknowledged. */
  notice?: string | null;
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
  notice = null,
  localFixtures,
  reducedMotion,
  roundsPlayed,
  correctCount,
  bestStreak,
  runComplete,
}: HomeScreenProps) {
  const summary = runSummaryLabel({ roundsPlayed, correctCount, bestStreak, complete: runComplete });
  const { fontScale } = useWindowDimensions();
  // A 92pt wordmark is wider than the phone once the text scale passes roughly this
  // much, and homeHero clips rather than wraps, so it rendered as "SAI". Dropping to
  // the title role keeps it whole.
  //
  // This is a scale-aware layout rule, not an opt-out from text scaling: the two
  // props that would do that are banned by fontScaling.test.mjs, and they would
  // shrink every other label on the screen along with the wordmark. Naming them
  // here is enough to trip that scan — it reads source as text — which is why this
  // comment talks around them.
  const hugeText = fontScale >= 1.6;
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
    <FadeIn reducedMotion={reducedMotion} style={s.homeFill}>
      {/*
        Home scrolls. At accessibility text sizes the hero alone can fill the
        screen, and this was a fixed column: whatever did not fit was simply gone.
      */}
      <ScrollView contentContainerStyle={s.home}>
      <View style={s.homeHero}>
        <View style={s.homeMark} pointerEvents="none">
          <Mark name="open" size={300} color={volt.color.dark.lime} decorative />
        </View>
        <Text style={s.eyebrowPink}>REAL QUOTES.</Text>
        <Text style={s.eyebrowLime}>TOTAL LIES.</Text>
        <Text style={[s.heroTitle, hugeText && s.heroTitleCompact]}>{"SAID\nTHAT?"}</Text>
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
            // Ceil, because the copies below are laid out AT this width: a
            // fractional measurement rounds down against the text that produced
            // it, and numberOfLines={1} then truncates each copy with an ellipsis
            // — visible mid-strip as "…" rather than a clean loop.
            onLayout={(e) => setTickerWidth(Math.ceil(e.nativeEvent.layout.width))}
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
          {/*
            Two copies, so the second covers the gap as the first scrolls out, and
            the track travels one measured width per loop.

            `ellipsizeMode="clip"` because a copy still gets constrained to the
            row's available width and numberOfLines={1} would otherwise draw a "…"
            in the middle of a scrolling strip. Clipping is what a ticker wants
            anyway — the wrap is hidden by tickerWrap's overflow.

            Not given `width: tickerWidth` either: pinning a Text to a measured
            width truncates it the moment the two disagree by a fraction, and at
            accessibility sizes that width became a layer too large to rasterise,
            which is what blanked the strip entirely.
          */}
          <Text numberOfLines={1} ellipsizeMode="clip" style={s.tickerText}>
            {TICKER}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="clip" style={s.tickerText}>
            {TICKER}
          </Text>
        </Animated.View>
      </View>

      <View style={s.homeFooter}>
        {/* The words carry the meaning, not the colour — per the design DNA. */}
        {notice && (
          <Text style={s.resetNotice} accessibilityRole="alert">
            {notice}
          </Text>
        )}
        <PrimaryButton label="START A ROOM" hero onPress={onStart} />
        <Text style={s.homeFootnote}>No accounts · no feed · everything stays on this phone</Text>
        {localFixtures && <Text style={s.fixture}>{FIXTURE_DISCLOSURE}</Text>}
      </View>
      </ScrollView>
    </FadeIn>
  );
}
