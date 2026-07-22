import { useCallback, useRef } from "react";
import { Animated } from "react-native";

import { springConfig } from "../theme/motion";
import { hotmic } from "../theme/tokens";
import { commitFeedback, selectionFeedback } from "./haptics";
import { interaction } from "./interactionPolicy.js";

export type InteractionKind = "tap" | "primary" | "toggle" | "answerCommit";

export type FireEventOptions = {
  onPress?: () => void;
  haptics?: boolean;
  reducedMotion?: boolean;
};

/**
 * Unifies a pressable's motion + haptics + hit target into one "fire event", driven by
 * the interaction policy. Motion is core RN Animated (native driver, scale only); haptics
 * fire on discrete gesture phases (press-in / commit). Reduced motion skips the scale but
 * keeps the haptics and the resting layout. Spread `pressableProps` onto a Pressable and
 * apply `animatedStyle` to an Animated.View wrapper.
 */
export function useFireEvent(kind: InteractionKind, options: FireEventOptions = {}) {
  const { onPress, haptics = true, reducedMotion = false } = options;
  const scale = useRef(new Animated.Value(1)).current;
  const policy = interaction(kind);

  const onPressIn = useCallback(() => {
    if (policy.pressInHaptic === "selection") selectionFeedback(haptics);
    if (reducedMotion) return;
    const dip = kind === "answerCommit" ? hotmic.spring.kick.dip : 0.97;
    Animated.spring(scale, { toValue: dip, ...springConfig("snappy") }).start();
  }, [policy.pressInHaptic, haptics, reducedMotion, kind, scale]);

  const onPressOut = useCallback(() => {
    // The KICK settles on commit; other interactions relax on release.
    if (kind !== "answerCommit" && !reducedMotion) {
      Animated.spring(scale, { toValue: 1, ...springConfig("snappy") }).start();
    }
  }, [kind, reducedMotion, scale]);

  const onCommit = useCallback(() => {
    if (policy.commitHaptic === "commit") commitFeedback(haptics);
    else if (policy.commitHaptic === "selection") selectionFeedback(haptics);
    if (kind === "answerCommit") {
      if (reducedMotion) {
        scale.setValue(1);
      } else {
        // KICK: (already dipped) -> overshoot -> settle.
        Animated.sequence([
          Animated.spring(scale, { toValue: hotmic.spring.kick.overshoot, ...springConfig("snappy") }),
          Animated.spring(scale, { toValue: hotmic.spring.kick.settle, ...springConfig("standard") }),
        ]).start();
      }
    }
    onPress?.();
  }, [policy.commitHaptic, haptics, kind, reducedMotion, scale, onPress]);

  return {
    animatedStyle: { transform: [{ scale }] },
    pressableProps: {
      onPressIn,
      onPressOut,
      onPress: onCommit,
      hitSlop: hotmic.target.hitSlop,
    },
  };
}
