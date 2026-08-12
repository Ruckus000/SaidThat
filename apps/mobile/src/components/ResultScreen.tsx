import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

import { announce } from "../feedback/announce";
import { revealFeedback } from "../feedback/haptics";
import { volt } from "../theme/tokens";
import {
  continueLabel,
  resultHeadline,
  resultKicker,
  resultMarkName,
  resultRewardLabel,
  resultStreakLabel,
  streakSparkCount,
} from "./presentationLabels";
import { Mark } from "./Mark";
import { StreakSparks } from "./StreakSparks";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ResultScreenProps = {
  correct: boolean;
  streak: number;
  roundIndex: number;
  totalRounds: number;
  reducedMotion: boolean;
  haptics: boolean;
  /**
   * This round's verdict has already been shown once. Skips straight to it.
   *
   * Held by App rather than here because this screen UNMOUNTS on interruption —
   * a backgrounded app (an incoming call, Control Center) routes through PAUSED,
   * and `key` cannot preserve state across an unmount, only across a re-render.
   */
  initiallyRevealed?: boolean;
  /** Fired the first time the verdict is on screen, so App can remember it. */
  onRevealed?: () => void;
  onReview: () => void;
  onContinue: () => void;
};

const SUSPENSE_MS = volt.motion.durations.locking;

export function ResultScreen({
  correct,
  streak,
  roundIndex,
  totalRounds,
  reducedMotion,
  haptics,
  initiallyRevealed = false,
  onRevealed,
  onReview,
  onContinue,
}: ResultScreenProps) {
  // Post-commit anticipation beat: the tap is already registered, so this never
  // makes tap-play second-class and adds no answer countdown. Reduced motion
  // skips straight to the verdict with the identical words and reward.
  //
  // `initiallyRevealed` skips it for a second reason: the verdict was already
  // shown and the player was interrupted. Making them sit through the beat again
  // for a result they have seen — with both actions gone for 850ms — is the
  // anticipation working against them.
  //
  // `stamp` takes the same seed so the verdict is not blank on the frame before
  // effects flush — it drives the mark's opacity and the verdict's scale. The
  // effect below sets it too, which makes the seed unobservable from a test:
  // mutation-checked, and removing it changes nothing jest can see. It stays for
  // the pre-effect frame on a real device, and this comment says so rather than
  // letting a passing suite imply the seed is what protects that.
  const alreadySeen = reducedMotion || initiallyRevealed;
  const [revealed, setRevealed] = useState(alreadySeen);
  const stamp = useRef(new Animated.Value(alreadySeen ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const next = continueLabel({ roundIndex, totalRounds });
  const streakLine = resultStreakLabel(streak);
  // Parent re-renders from onRevealed create a new callback identity every time.
  // Holding the latest in a ref and ignoring identity in the effect deps means
  // feedback/announce fire once per mount, not once per parent render.
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;
  const revealFeedbackFired = useRef(false);

  useEffect(() => {
    // Already on screen — either reduced motion, or this round's verdict was
    // shown before an interruption. Nothing to animate towards.
    if (alreadySeen) {
      // Not just an early return. Both of these are seeded at MOUNT from
      // reducedMotion, so a player who turns it on DURING the beat had them
      // seeded false: the cleanup below clears the reveal timer, this effect
      // returns, and nothing else ever sets `revealed` — leaving them stuck on
      // "LOCKING IT IN…" one round into a run they cannot continue. Someone
      // reaching for Reduce Motion mid-beat is doing it because the motion
      // bothers them, which is the worst possible moment to strand them.
      //
      // `stamp` is as load-bearing as `revealed`: it drives the mark's opacity
      // and the verdict's scale, so setting `revealed` alone swaps the beat for a
      // screen that is technically the verdict and visually blank.
      stamp.setValue(1);
      setRevealed(true);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    const timer = setTimeout(() => {
      loop.stop();
      setRevealed(true);
      Animated.spring(stamp, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }, SUSPENSE_MS);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [alreadySeen, stamp, pulse]);

  // Captured at mount: was this screen restored, or is the verdict arriving?
  const restored = useRef(initiallyRevealed).current;

  useEffect(() => {
    if (!revealed || revealFeedbackFired.current) return;
    revealFeedbackFired.current = true;
    onRevealedRef.current?.();
    // Feedback and the announcement belong to a verdict ARRIVING. Firing them on
    // a restored screen buzzed a second time for one answer and told VoiceOver a
    // new verdict had landed — half the reason the replay was worth fixing.
    if (restored) return;
    revealFeedback(haptics);
    // The verdict arrives on a timer, not on a touch, so nothing moves screen
    // reader focus to it. Both halves are strings already on screen — the
    // headline and its kicker — joined, never a separately-worded line.
    announce(`${resultHeadline(correct)} ${resultKicker(correct)}`);
  }, [revealed, haptics, correct, restored]);

  if (!revealed) {
    return (
      <View style={s.lockingWrap}>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }}>
          <Mark name="selectionDot" size={44} color={volt.color.dark.lime} />
        </Animated.View>
        <Animated.Text
          style={[
            s.suspense,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
          ]}
        >
          LOCKING IT IN…
        </Animated.Text>
        <Text style={s.copy}>The room leans in.</Text>
      </View>
    );
  }

  const flashStyle = correct ? s.resultFlashHit : s.resultFlashMiss;

  return (
    <View style={[s.resultFlash, flashStyle]}>
      <View style={s.resultBody}>
        <Animated.View
          style={{
            opacity: stamp,
            transform: [
              { translateY: stamp.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            ],
          }}
        >
          <Mark name={resultMarkName(correct)} size={72} color={volt.color.dark.onHero} />
        </Animated.View>
        <Text style={s.resultKicker}>{resultKicker(correct)}</Text>
        <Animated.Text
          style={[
            s.verdict,
            {
              transform: [
                {
                  scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }),
                },
                {
                  rotate: stamp.interpolate({
                    inputRange: [0, 1],
                    outputRange: correct ? ["-10deg", "-3deg"] : ["8deg", "2deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {resultHeadline(correct).replace(" ", "\n")}
        </Animated.Text>
        {correct ? (
          <Text style={s.reward}>{resultRewardLabel(correct)}</Text>
        ) : (
          <Text style={s.rewardMiss}>{resultRewardLabel(correct)}</Text>
        )}
        {correct && streakLine && (
          <View style={[s.streakPill, s.pillRow]}>
            <StreakSparks
              count={streakSparkCount(streak)}
              size={14}
              color={volt.color.dark.onHero}
            />
            <Text style={s.streakPillText}>{streakLine}</Text>
          </View>
        )}
      </View>
      <View style={s.resultActions}>
        <PrimaryButton
          label="SEE THE TRUTH"
          onFlash
          onFlashMiss={!correct}
          onPress={onReview}
        />
        <PrimaryButton label={next} outlineOnFlash onPress={onContinue} />
      </View>
    </View>
  );
}
