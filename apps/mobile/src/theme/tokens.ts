import { dark as hotmicDark, light as hotmicLight } from "./palette.js";

/**
 * VOLT design system — the sole token layer. Color hexes come from `palette.js`,
 * the single source verified for WCAG 2.2 AA by `contrast.test.mjs`. The export
 * name `hotmic` is retained so existing imports stay stable during the skin swap.
 */
export const hotmic = {
  color: {
    dark: hotmicDark,
    light: hotmicLight,
  },
  // Modular type ramp: each role bakes size + lineHeight + weight + tracking, so no
  // component reconstructs a scale by arithmetic. Statement auto-shrinks size->minSize.
  type: {
    displayXL: { size: 92, lineHeight: 84, weight: "800" as const, tracking: -2 },
    displayL: { size: 58, lineHeight: 56, weight: "800" as const, tracking: -2 },
    statement: { size: 34, minSize: 28, lineHeight: 40, weight: "700" as const, tracking: 0 },
    verdict: { size: 96, lineHeight: 88, weight: "800" as const, tracking: -3 },
    title: { size: 44, lineHeight: 42, weight: "800" as const, tracking: -1 },
    body: { size: 17, lineHeight: 24, weight: "400" as const, tracking: 0 },
    label: { size: 14, lineHeight: 18, weight: "800" as const, tracking: 2 },
    caption: { size: 13, lineHeight: 18, weight: "600" as const, tracking: 0.4 },
  },
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 64 },
  radius: { sm: 10, control: 16, panel: 28, pill: 999 },
  target: { minimum: 56, hitSlop: 8 },
  // Four named presets for core RN Animated (no Reanimated). snappy/standard/weighty
  // feed Animated.spring; kick is a sequence (dip -> overshoot -> settle) the answer
  // controls play on commit. Values are data; components own the sequencing.
  spring: {
    snappy: { stiffness: 260, damping: 18, mass: 1 },
    standard: { stiffness: 170, damping: 22, mass: 1 },
    weighty: { stiffness: 120, damping: 26, mass: 1.1 },
    kick: { dip: 0.97, overshoot: 1.03, settle: 1, stiffness: 300, damping: 16, mass: 1 },
  },
  motion: {
    durations: { instant: 0, quick: 120, travel: 240, stamp: 450, locking: 850 },
    easing: [0.2, 0.7, 0.3, 1] as const,
  },
} as const;
