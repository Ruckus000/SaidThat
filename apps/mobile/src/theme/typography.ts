import type { TextStyle } from "react-native";

import { hotmic } from "./tokens";

/**
 * Typography resolvers for the VOLT system.
 *
 * FONT SEAM: the faces are loaded in App via expo-font (assets/fonts) under these exact
 * family keys, with render gated on load and a system-face fallback on error, so text
 * never renders in a missing font. Display = Bricolage Grotesque; body/counters = Inter.
 */
export const FONT_FAMILY: { display?: string; body?: string } = {
  display: "BricolageGrotesque",
  body: "Inter",
};

export type TypeRole = keyof typeof hotmic.type;

const DISPLAY_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>([
  "displayXL",
  "displayL",
  "verdict",
  "label",
]);

/** Resolve a type role to a React Native TextStyle (size, line-height, weight, tracking). */
export function typeStyle(role: TypeRole): TextStyle {
  const t = hotmic.type[role];
  const family = DISPLAY_ROLES.has(role) ? FONT_FAMILY.display : FONT_FAMILY.body;
  return {
    fontSize: t.size,
    lineHeight: t.lineHeight,
    fontWeight: t.weight,
    letterSpacing: t.tracking,
    ...(family ? { fontFamily: family } : null),
  };
}

/** Counters use tabular figures so a rolling count grows only at the right edge. */
export function tabular(): TextStyle {
  return { fontVariant: ["tabular-nums"] };
}
