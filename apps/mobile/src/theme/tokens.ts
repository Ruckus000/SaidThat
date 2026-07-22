import { dark as hotmicDark, light as hotmicLight } from "./palette.js";

/**
 * HOT MIC design system (see docs/ux-design-direction.md) — the sole token layer;
 * the legacy `tokens` export was retired once every component migrated. Color hexes
 * come from `palette.js`, the single source verified for WCAG 2.2 AA by
 * `contrast.test.mjs`.
 */
export const hotmic = {
  color: {
    dark: hotmicDark,
    light: hotmicLight,
  },
  // Modular type ramp: each role bakes size + lineHeight + weight + tracking, so no
  // component reconstructs a scale by arithmetic. Statement auto-shrinks size->minSize.
  type: {
    displayXL: { size: 56, lineHeight: 60, weight: "800" as const, tracking: -0.5 },
    displayL: { size: 40, lineHeight: 44, weight: "800" as const, tracking: -0.25 },
    statement: { size: 46, minSize: 28, lineHeight: 50, weight: "600" as const, tracking: 0 },
    verdict: { size: 40, lineHeight: 44, weight: "800" as const, tracking: 0.5 },
    title: { size: 24, lineHeight: 30, weight: "700" as const, tracking: 0 },
    body: { size: 18, lineHeight: 24, weight: "400" as const, tracking: 0 },
    label: { size: 15, lineHeight: 20, weight: "800" as const, tracking: 1.2 },
    caption: { size: 13, lineHeight: 18, weight: "600" as const, tracking: 0.4 },
  },
  // Regular ramp — promotes the previously arithmetic 12 and 32 into real steps.
  spacing: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 64 },
  radius: { sm: 10, control: 18, panel: 24, pill: 999 },
  target: { minimum: 56, hitSlop: 8 },
  // Four named presets for core RN Animated (no Reanimated). snappy/standard/weighty
  // feed Animated.spring; kick is a sequence (dip -> overshoot -> settle) the answer
  // controls play on commit. Values are data; components own the sequencing.
  spring: {
    snappy: { stiffness: 260, damping: 18, mass: 1 },
    standard: { stiffness: 170, damping: 22, mass: 1 },
    weighty: { stiffness: 120, damping: 26, mass: 1.1 },
    kick: { dip: 0.94, overshoot: 1.03, settle: 1, stiffness: 300, damping: 16, mass: 1 },
  },
  motion: {
    durations: { instant: 0, quick: 120, travel: 240 },
    easing: [0.2, 0.7, 0.3, 1] as const,
  },
} as const;
