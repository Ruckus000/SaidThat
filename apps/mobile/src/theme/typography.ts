import type { TextStyle } from "react-native";

import { hotmic } from "./tokens";

/**
 * Typography resolvers for the HOT MIC system.
 *
 * FONT SEAM: the display + Inter faces are loaded in Phase 1.5 (they are binary font
 * files). Until then `FONT_FAMILY` is `undefined` (the platform system face), and the
 * display voice is carried by weight + tracking, exactly as the direction's fallback
 * path specifies — the app never depends on a font that may be missing. When the faces
 * land, set these two values and every role picks them up.
 */
export const FONT_FAMILY: { display?: string; body?: string } = {
  display: undefined,
  body: undefined,
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
