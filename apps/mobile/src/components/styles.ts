import { StyleSheet } from "react-native";

import { hotmic } from "../theme/tokens";
import { FONT_FAMILY } from "../theme/typography";

/**
 * Shared style layer, on the HOT MIC system (dark theme). Layout/geometry is unchanged
 * from the previous pass; this migrates COLOR + TYPE onto `hotmic` with the reserved-
 * marigold discipline: marigold appears only on the single primary action and the beacon
 * (the one lit game-context marker); payoffRose only on the reward; selection/toggle-on
 * states are neutral plum; the two answer controls are neutral so nothing nudges a verdict.
 */
const c = hotmic.color.dark;
const display = FONT_FAMILY.display;
const body = FONT_FAMILY.body;
const plumSelected = "#6B4D78";

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  app: { flex: 1, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, minHeight: 56 },
  brand: { color: c.textPrimary, fontFamily: display, fontSize: 16, fontWeight: "800", letterSpacing: 1.5 },
  scoreWrap: { alignItems: "flex-end" },
  score: { color: c.textPrimary, fontFamily: display, fontSize: 20, fontWeight: "800", letterSpacing: 0.5, fontVariant: ["tabular-nums"] },
  streakBadge: { color: c.warning, fontFamily: body, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, marginTop: 2 },
  center: { flex: 1, justifyContent: "center", gap: 16 },
  setup: { flexGrow: 1, justifyContent: "center", gap: 16, paddingVertical: 32 },
  eyebrow: { color: c.textMuted, fontFamily: display, fontSize: 13, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: c.textPrimary, fontFamily: display, fontSize: 38, fontWeight: "800", lineHeight: 43 },
  copy: { color: c.textMuted, fontFamily: body, fontSize: 18, lineHeight: 24 },
  note: { color: c.textMuted, fontFamily: body, fontSize: 14, lineHeight: 20 },
  fixture: { color: c.warning, fontFamily: body, fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  runSummary: { color: c.textMuted, fontFamily: display, fontSize: 13, fontWeight: "800", letterSpacing: 0.8 },
  button: { backgroundColor: c.marigoldFill, minHeight: 56, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, borderRadius: 18 },
  buttonText: { color: c.onHero, fontFamily: display, fontSize: 18, fontWeight: "800", textAlign: "center" },
  secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.outline },
  secondaryText: { color: c.textPrimary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  link: { color: c.textPrimary, fontFamily: body, textAlign: "center", fontWeight: "600", padding: 10 },
  pauseTap: { minHeight: 56, justifyContent: "center", alignItems: "center" },
  group: { gap: 8 },
  choice: { borderWidth: 2, borderColor: c.outline, backgroundColor: c.surface, padding: 18, borderRadius: 18, gap: 6 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: c.outline, backgroundColor: c.surface },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { color: c.textPrimary, fontFamily: body, fontSize: 18, fontWeight: "600" },
  toggleHint: { color: c.textMuted, fontFamily: body, fontSize: 13, lineHeight: 18 },
  togglePill: { minWidth: 56, minHeight: 32, paddingHorizontal: 10, borderRadius: 18, borderWidth: 2, borderColor: c.outline, alignItems: "center", justifyContent: "center" },
  togglePillOn: { borderColor: plumSelected, backgroundColor: c.surfaceRaised },
  togglePillText: { color: c.textMuted, fontFamily: display, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  togglePillTextOn: { color: c.textPrimary },
  choiceActive: { borderColor: plumSelected, backgroundColor: c.surfaceRaised },
  choiceTitle: { color: c.textPrimary, fontFamily: display, fontSize: 21, fontWeight: "800" },
  choiceBody: { color: c.textMuted, fontFamily: body, fontSize: 15, lineHeight: 21 },
  sectionLabel: { color: c.textMuted, fontFamily: display, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  round: { flex: 1, paddingTop: 36, gap: 16 },
  mode: { color: c.textMuted, fontFamily: display, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  beacon: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.outline, paddingVertical: 8 },
  game: { color: c.textMuted, fontFamily: display, fontSize: 12, fontWeight: "800", letterSpacing: 1, textAlign: "center" },
  markBeacon: { alignItems: "center", marginBottom: 4 },
  cardFill: { flex: 1 },
  card: { flexGrow: 1, justifyContent: "center", gap: 16 },
  quote: { color: c.textPrimary, fontFamily: display, fontSize: 36, fontWeight: "800", lineHeight: 43 },
  quoteSmall: { color: c.textMuted, fontFamily: display, fontSize: 20, fontWeight: "600", lineHeight: 28 },
  truthReveal: { color: c.textPrimary, fontFamily: display, fontSize: 32, fontWeight: "800", letterSpacing: 0.5, lineHeight: 38 },
  person: { color: c.textMuted, fontFamily: body, fontSize: 20, fontWeight: "600" },
  instruction: { color: c.textMuted, fontFamily: body, fontSize: 16, lineHeight: 22 },
  actions: { gap: 12 },
  report: { borderTopWidth: 1, borderColor: c.outline, paddingTop: 18, gap: 12 },
  success: { color: c.safe, fontFamily: body, fontSize: 14, lineHeight: 20 },
  error: { color: c.danger, fontFamily: body, fontSize: 14, lineHeight: 20 },

  // Recap / rematch
  recapRank: { color: c.textPrimary, fontFamily: display, fontSize: 38, fontWeight: "800", letterSpacing: 1, lineHeight: 44 },
  statBlock: { borderTopWidth: 1, borderColor: c.outline, marginTop: 8 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: c.outline, paddingVertical: 12 },
  statLabel: { color: c.textMuted, fontFamily: display, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  statValue: { color: c.textPrimary, fontFamily: display, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },

  // Reveal / reward
  suspense: { color: c.textMuted, fontFamily: display, fontSize: 14, fontWeight: "800", letterSpacing: 2, textAlign: "center" },
  resultMark: { color: c.textPrimary, fontFamily: display, fontSize: 52, fontWeight: "800", textAlign: "center", lineHeight: 56 },
  reward: { color: c.payoffRose, fontFamily: display, fontSize: 24, fontWeight: "800", letterSpacing: 0.5, textAlign: "center" },

  // Equal-weight answer controls: both neutral (no marigold), so nothing nudges a verdict.
  answers: { gap: 12 },
  answer: { minHeight: 64, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, borderRadius: 18, borderWidth: 2, borderColor: c.outline, backgroundColor: c.surfaceRaised },
  answerText: { color: c.textPrimary, fontFamily: display, fontSize: 19, fontWeight: "800", textAlign: "center" },
  answerHint: { color: c.textMuted, fontFamily: body, fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 2 },
});
