import type { TextStyle } from "react-native";

import { volt, type TypeRoleSpec } from "./tokens";

/**
 * Typography resolvers for the VOLT system.
 *
 * FONT SEAM: the faces are loaded in App via expo-font (assets/fonts) under these exact
 * family keys, with render gated on load. Display = Bricolage Grotesque;
 * body/counters = Inter.
 *
 * WHAT HAPPENS ON A LOAD ERROR: App falls through and renders anyway, and every
 * style still names the family it just failed to load. The platform's own font
 * fallback is what keeps text legible — metrics shift, but nothing disappears.
 * There is no app-level fallback, and this comment used to claim one: it said a
 * "system-face fallback on error, so text never renders in a missing font".
 *
 * That would be a small change if these values were read at render time. They are
 * not. `styles.ts` copies both into module-scope consts at import and freezes them
 * into StyleSheet.create — 49 declarations — so reassigning FONT_FAMILY after a
 * load error changes nothing a player sees. `typeStyle` below DOES read them per
 * call and would honour it, but nothing calls `typeStyle`. Implementing the
 * fallback for real means making the stylesheet a function of font state and
 * threading it through every component; that is a deliberate refactor, not a
 * comment fix. Until someone decides to do it, this says what the code does.
 */
export const FONT_FAMILY: { display?: string; body?: string } = {
  display: "BricolageGrotesque",
  body: "Inter",
};

export type TypeRole = keyof typeof volt.type;

const DISPLAY_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>([
  "displayXL",
  "displayL",
  "verdict",
  "label",
]);

/**
 * Resolve a type role to a React Native TextStyle (size, line-height, weight, tracking).
 *
 * Only what the role defines is emitted. The step roles added for `styles.ts` fix a
 * size and sometimes a line height and nothing else, so this must not write
 * `fontWeight: undefined` over a style it is spread into.
 *
 * DISPLAY_ROLES covers the semantic ramp only. The step roles are used at both
 * families — `bodyM` is the display-face secondary button and the body-face miss
 * line — so family is not a property of those roles, and they resolve to body here.
 * Nothing calls this function today (see the FONT SEAM note above).
 */
export function typeStyle(role: TypeRole): TextStyle {
  const t: TypeRoleSpec = volt.type[role];
  const family = DISPLAY_ROLES.has(role) ? FONT_FAMILY.display : FONT_FAMILY.body;
  return {
    fontSize: t.size,
    ...(t.lineHeight != null ? { lineHeight: t.lineHeight } : null),
    ...(t.weight != null ? { fontWeight: t.weight } : null),
    ...(t.tracking != null ? { letterSpacing: t.tracking } : null),
    ...(family ? { fontFamily: family } : null),
  };
}

/** Counters use tabular figures so a rolling count grows only at the right edge. */
export function tabular(): TextStyle {
  return { fontVariant: ["tabular-nums"] };
}
