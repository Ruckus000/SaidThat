import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { volt } from "./tokens";

/**
 * Motion helpers for the HOT MIC system, on core RN Animated (no Reanimated).
 * `springConfig` turns a named preset into an Animated.spring config; the KICK is a
 * dip -> overshoot -> settle SEQUENCE that its consumers author from `volt.spring.kick`,
 * so it is intentionally excluded here.
 */
export type SpringPreset = Exclude<keyof typeof volt.spring, "kick">;

export function springConfig(preset: SpringPreset) {
  const s = volt.spring[preset];
  return {
    stiffness: s.stiffness,
    damping: s.damping,
    mass: s.mass,
    useNativeDriver: true,
  } as const;
}

/** Live "reduce motion" preference, mirroring the FadeIn reduced-motion pattern. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
