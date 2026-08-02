import type { TextStyle } from "react-native";

import { dark as voltDark, light as voltLight } from "./palette.js";

/**
 * A type role. `weight`/`tracking` are optional because the roles added for the
 * step scale below carry only what the design actually fixes — a size, and a
 * line height where the text sets one. Nothing here is filled in to satisfy a
 * shape; a role omits what it does not define.
 */
export type TypeRoleSpec = {
  size: number;
  minSize?: number;
  lineHeight?: number;
  weight?: TextStyle["fontWeight"];
  tracking?: number;
};

/**
 * VOLT design system — the sole token layer. Color hexes come from `palette.js`,
 * the single source verified for WCAG 2.2 AA by `contrast.test.mjs`.
 */
export const volt = {
  color: {
    dark: voltDark,
    light: voltLight,
  },
  // Modular type ramp: each role bakes size + lineHeight + weight + tracking, so no
  // component reconstructs a scale by arithmetic. Statement auto-shrinks size->minSize.
  //
  // The first eight are the semantic ramp. Below them are the remaining steps the
  // shipped screens actually use: `styles.ts` had all twenty sizes as bare numbers,
  // which is exactly the arithmetic this comment claimed nobody did. They are named
  // here so the stylesheet reads sizes from one place. These steps deliberately fix
  // only size (and line height where the text sets one) — weight and tracking vary
  // per use, so a role does not pretend to own them.
  type: {
    displayXL: { size: 92, lineHeight: 84, weight: "800", tracking: -2 },
    displayL: { size: 58, lineHeight: 56, weight: "800", tracking: -2 },
    statement: { size: 34, minSize: 28, lineHeight: 40, weight: "700", tracking: 0 },
    verdict: { size: 96, lineHeight: 88, weight: "800", tracking: -3 },
    title: { size: 44, lineHeight: 42, weight: "800", tracking: -1 },
    body: { size: 17, lineHeight: 24, weight: "400", tracking: 0 },
    label: { size: 14, lineHeight: 18, weight: "800", tracking: 2 },
    caption: { size: 13, lineHeight: 18, weight: "600", tracking: 0.4 },

    // Step scale. `beacon` is `typography.size.beacon` from the DesignOps contract.
    micro: { size: 11 },
    beacon: { size: 12 },
    bodyS: { size: 14, lineHeight: 20 },
    labelL: { size: 15 },
    bodyCompact: { size: 15, lineHeight: 21 },
    bodyM: { size: 18 },
    bodyL: { size: 19 },
    action: { size: 20 },
    actionL: { size: 22 },
    suspense: { size: 24 },
    headline: { size: 26 },
    statementCompact: { size: 28, lineHeight: 34 },
    statementTight: { size: 34, lineHeight: 38 },
    displayM: { size: 64, lineHeight: 60 },
    rank: { size: 72, lineHeight: 68 },
  } satisfies Record<string, TypeRoleSpec>,
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
