import { StyleSheet } from "react-native";

import { volt } from "../theme/tokens";
import { FONT_FAMILY } from "../theme/typography";

/**
 * Shared style layer on the VOLT system (dark theme). Lime is the primary signal
 * and CTA fill; pink is the secondary answer / miss / destructive accent. Every
 * colored state keeps a text label (and MARK glyph for truth).
 */
const c = volt.color.dark;
const t = volt.type;
const display = FONT_FAMILY.display;
const body = FONT_FAMILY.body;

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  app: { flex: 1, paddingHorizontal: 24, paddingBottom: 8 },
  appBleed: { paddingHorizontal: 0, paddingBottom: 0 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    minHeight: 56,
    paddingHorizontal: 0,
    gap: 8,
    // Wrap before shrink. Shrinking alone got the score pill down to one character
    // per line at the largest text size — no longer clipped, but a tall alphabet
    // soup. Wrapping drops it onto its own row intact instead.
    flexWrap: "wrap",
  },
  brand: {
    // The wordmark scales with the text size and pushed the score pill off the
    // right edge. Shrink lets it give ground first; the row's flexWrap above is
    // what keeps the pill whole once there is no ground left to give.
    flexShrink: 1,
    color: c.lime,
    fontFamily: display,
    fontSize: t.label.size,
    fontWeight: "800",
    letterSpacing: 2,
  },
  scoreWrap: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  scorePill: {
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexShrink: 1,
  },
  scorePillHot: {
    borderColor: c.lime,
  },
  score: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  scoreHot: { color: c.lime },
  gear: {
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  // Pills and stat values that pair a drawn glyph with their label.
  pillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sparkRow: { flexDirection: "row", alignItems: "center", gap: 2 },

  center: { flex: 1, justifyContent: "center", gap: 14 },
  // The scrolling twin of `center`, for a ScrollView's contentContainerStyle.
  // `flexGrow` rather than `flex` so short content still centres in the viewport
  // while long content — a large accessibility text size — grows past it and
  // scrolls instead of being clipped at the bottom edge.
  centerScroll: { flexGrow: 1, justifyContent: "center", gap: 14 },
  setup: { flexGrow: 1, justifyContent: "center", gap: 12, paddingVertical: 24 },

  eyebrow: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.caption.size,
    fontWeight: "800",
    letterSpacing: 3,
  },
  eyebrowPink: {
    color: c.pink,
    fontFamily: display,
    fontSize: t.labelL.size,
    fontWeight: "800",
    letterSpacing: 3,
  },
  eyebrowLime: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.labelL.size,
    fontWeight: "800",
    letterSpacing: 3,
  },
  title: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.title.size,
    fontWeight: "800",
    lineHeight: t.title.lineHeight,
    letterSpacing: -1,
  },
  // The wordmark at a size that still fits the screen once the text scale is large.
  // Same role as `title`, applied only above the threshold in HomeScreen.
  heroTitleCompact: { fontSize: t.title.size, lineHeight: t.title.lineHeight },
  heroTitle: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.displayXL.size,
    fontWeight: "800",
    lineHeight: t.displayXL.lineHeight,
    letterSpacing: -2,
  },
  copy: { color: c.textMuted, fontFamily: body, fontSize: t.body.size, lineHeight: t.body.lineHeight },
  note: { color: c.textDim, fontFamily: body, fontSize: t.caption.size, lineHeight: t.caption.lineHeight },
  fixture: {
    color: c.warning,
    fontFamily: body,
    fontSize: t.micro.size,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
  resetNotice: {
    color: c.warning,
    fontFamily: body,
    fontSize: t.caption.size,
    lineHeight: t.caption.lineHeight,
    textAlign: "center",
    marginBottom: 12,
  },
  runSummary: {
    color: c.textDim,
    fontFamily: display,
    fontSize: t.caption.size,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 6,
  },

  button: {
    backgroundColor: c.limeFill,
    minHeight: 64,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: c.lime,
    shadowOpacity: 0.35,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  // Three-step CTA scale: hero 22 (the one action that opens a stage), default 20,
  // secondary 18. Deliberately coarser than the mockup's per-screen sizes.
  buttonText: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.action.size,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  buttonTextHero: { fontSize: t.actionL.size },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: c.outline,
    shadowOpacity: 0,
    elevation: 0,
    minHeight: 60,
  },
  secondaryText: { color: c.textPrimary, fontSize: t.bodyM.size },
  destructive: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: c.outline,
    shadowOpacity: 0,
    elevation: 0,
    minHeight: 60,
  },
  destructiveText: { color: c.pink, fontSize: t.body.size },
  onFlash: {
    backgroundColor: c.onHero,
    shadowOpacity: 0,
    elevation: 0,
  },
  onFlashText: { color: c.lime },
  onFlashMissText: { color: c.pink },
  outlineOnFlash: {
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: c.onHero,
    shadowOpacity: 0,
    elevation: 0,
  },
  outlineOnFlashText: { color: c.onHero },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.97 }] },
  link: {
    color: c.textDim,
    fontFamily: body,
    textAlign: "center",
    fontWeight: "600",
    fontSize: t.label.size,
    padding: 4,
  },
  pauseTap: { minHeight: 44, justifyContent: "center", alignItems: "center" },

  group: { gap: 10 },
  choice: {
    borderWidth: 3,
    borderColor: c.outline,
    backgroundColor: c.surface,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderRadius: 24,
    gap: 6,
  },
  choiceActive: {
    borderColor: c.lime,
    shadowColor: c.lime,
    shadowOpacity: 0.18,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  choiceInactive: { opacity: 0.55 },
  // Glyph beside title. Wraps so the title drops under the mark rather than being
  // cut off by the card edge at accessibility text sizes.
  choiceRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  choiceTitle: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.headline.size,
    fontWeight: "800",
    // Without this the title keeps its intrinsic width in the row and runs past
    // the card instead of wrapping inside it. PRIVATE RELAY clipped mid-word.
    flexShrink: 1,
  },
  choiceTitleActive: { color: c.lime },
  choiceBody: { color: c.textMuted, fontFamily: body, fontSize: t.bodyCompact.size, lineHeight: t.bodyCompact.lineHeight },

  segment: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    overflow: "hidden",
    // Stacks instead of overlapping. At AX5 the two labels drew on top of each
    // other, both unreadable; wrapping gives each its own full-width row.
    flexWrap: "wrap",
  },
  segmentItem: {
    // Was `flex: 1` — a zero basis, so each half was exactly 50% no matter how
    // wide the label got, and the text spilled over its neighbour. `auto` makes
    // the label's own width the basis that wrapping is decided on, while the
    // 48% floor keeps the two halves even at every size that still fits one row.
    flexGrow: 1,
    flexBasis: "auto",
    minWidth: "48%",
    minHeight: 52,
    // Clears the capsule's corner radius. Once the control stacks, each row is
    // tall enough that a 999 radius curves right through where the label sits,
    // and `overflow: hidden` on the container was cutting the ends off it.
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  segmentItemOn: { backgroundColor: c.lime },
  segmentText: {
    fontFamily: display,
    fontSize: t.label.size,
    fontWeight: "800",
    letterSpacing: 1,
    color: c.textMuted,
  },
  segmentTextOn: { color: c.onHero },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.outline,
    backgroundColor: c.surface,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { color: c.textPrimary, fontFamily: body, fontSize: t.body.size, fontWeight: "600" },
  toggleHint: { color: c.textDim, fontFamily: body, fontSize: t.caption.size, lineHeight: t.caption.lineHeight },
  togglePill: {
    minWidth: 52,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.outline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  togglePillOn: { borderColor: c.lime, backgroundColor: c.lime },
  togglePillText: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
  },
  togglePillTextOn: { color: c.onHero },

  sectionLabel: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // Home hero
  // Fills the stage; the scroller inside it owns the layout.
  homeFill: { flex: 1 },
  // Content container for that scroller. flexGrow keeps space-between doing what it
  // always did at sizes that fit, and lets the content run past the screen — and
  // scroll — at sizes that do not.
  home: { flexGrow: 1, justifyContent: "space-between", paddingBottom: 8 },
  homeHero: { flex: 1, justifyContent: "center", gap: 8, position: "relative", overflow: "hidden" },
  homeMark: {
    position: "absolute",
    // Sized for the 180px decorative Mark (was -70/-20 at 300px).
    right: -40,
    top: -8,
    opacity: 0.09,
    transform: [{ rotate: "12deg" }],
  },
  tickerWrap: {
    backgroundColor: c.lime,
    transform: [{ rotate: "-2deg" }, { scale: 1.06 }],
    paddingVertical: 10,
    marginVertical: 8,
    marginHorizontal: -10,
    overflow: "hidden",
  },
  // Measured off-screen at the string's TRUE width. Absolutely positioned with no
  // width so it shrink-wraps its child: a Text stretches to whatever width it is
  // given, so the old fixed 5000 box meant onLayout reported 5000 every time, at
  // every text size — the measurement was the box, never the string. Both copies
  // were then laid out 5000 wide, and at accessibility sizes that became a layer
  // too large for the GPU to rasterise, so the strip rendered blank.
  tickerMeasure: { position: "absolute", opacity: 0, top: 0, left: 0, alignSelf: "flex-start" },
  tickerTrack: { flexDirection: "row" },
  tickerText: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.labelL.size,
    fontWeight: "800",
    letterSpacing: 2,
    // Each copy keeps its natural width. In a row a Text is otherwise compressed
    // to the space available and numberOfLines={1} ellipsizes it, which drew a
    // "…" in the middle of the strip instead of a continuous loop.
    flexShrink: 0,
  },
  homeFooter: { gap: 10, paddingTop: 18 },
  homeFootnote: {
    color: c.textDim,
    fontSize: t.caption.size,
    textAlign: "center",
    fontFamily: body,
  },

  // Round
  round: { flex: 1, paddingTop: 8, gap: 12 },
  // Content container for the round's single scroller, which holds the whole
  // round — prompt, instruction, answers, pause. flexGrow so that at any size
  // which fits, the children lay out exactly as they did in the old flex column;
  // past that, the content grows and scrolls instead of being squeezed. See
  // RoundScreen for why nothing is pinned outside it.
  roundScroll: { flexGrow: 1, gap: 12 },
  roundTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    // Same rule as the shared header: two pills that both scale, so let the row
    // wrap rather than squeezing either one into a column of letters.
    flexWrap: "wrap",
  },
  roundPill: {
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    // Both pills grow with the text scale and together overran the row, clipping
    // the score off the right edge. Shrinking lets the labels wrap instead.
    flexShrink: 1,
  },
  roundPillText: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
  },
  // Right-hand context pill: score by default, lit streak badge once one is running.
  roundPillHot: {
    borderColor: c.lime,
    shadowColor: c.lime,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  roundPillTextMuted: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  roundPillTextHot: { color: c.lime },
  promptCard: {
    // flexGrow + NO shrink, deliberately. This was `flex: 1`, which is
    // flexShrink: 1 with a zero basis: as the instruction, answers and pause grew
    // with the text scale, they took the card's height away until its viewport was
    // near zero and the quote — the thing being voted on — scrolled out of sight
    // entirely. Growing to fill spare space is wanted; shrinking below the content
    // is what broke it.
    flexGrow: 1,
    flexShrink: 0,
    borderWidth: 3,
    borderColor: c.lime,
    borderRadius: 28,
    backgroundColor: c.surface,
    paddingVertical: 24,
    paddingHorizontal: 22,
    gap: 12,
    shadowColor: c.lime,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  promptBeacon: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cardFill: { flex: 1 },
  card: { flexGrow: 1, justifyContent: "center", gap: 14 },
  quote: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.statement.size,
    fontWeight: "700",
    lineHeight: t.statement.lineHeight,
    // Same reason as choiceTitle. Without it the statement keeps its intrinsic
    // width and the last line runs past the card: "snacks arrive." rendered as
    // "snacks arri". The whole point of the round is reading this text.
    flexShrink: 1,
  },
  quoteCompact: { fontSize: t.statementCompact.size, lineHeight: t.statementCompact.lineHeight },
  quoteSmall: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.statementTight.size,
    fontWeight: "800",
    lineHeight: t.statementTight.lineHeight,
  },
  person: { color: c.textMuted, fontFamily: body, fontSize: t.bodyL.size, fontWeight: "600", flexShrink: 1 },
  instruction: {
    color: c.textMuted,
    fontFamily: body,
    fontSize: t.bodyS.size,
    lineHeight: t.bodyS.lineHeight,
    textAlign: "center",
  },
  actions: { gap: 10 },
  report: { borderTopWidth: 2, borderColor: c.outline, paddingTop: 14, gap: 8, marginTop: 4 },
  reportChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reportChip: {
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    // Padding alone left these near 40pt — under the app's own token and under
    // both platforms' guidance. These are the controls a player reaches for when
    // something is wrong with the content, so they are the worst ones to make
    // fiddly. justifyContent keeps the label centred now the box is taller.
    minHeight: volt.target.minimum,
    justifyContent: "center",
  },
  // The chips already carry `disabled`, which Pressable turns into
  // accessibilityState — correct for assistive tech and invisible to everyone
  // else. This is the seeing half of the same fact.
  reportChipBusy: { opacity: 0.55 },
  // Selected state for the recap's laugh pick. The border colour is the seeing
  // half; accessibilityState carries the same fact for assistive tech, and the
  // chip label never depends on colour to be readable.
  reportChipSelected: { borderColor: c.lime },
  reportChipTextSelected: { color: c.lime },
  reportChipText: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
  },
  success: { color: c.lime, fontFamily: body, fontSize: t.caption.size, lineHeight: t.caption.lineHeight },
  error: { color: c.danger, fontFamily: body, fontSize: t.bodyS.size, lineHeight: t.bodyS.lineHeight },

  // Answers — labeled choice fills (text always present)
  answers: { gap: 10 },
  answer: {
    minHeight: 68,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  answerReal: { backgroundColor: c.lime },
  answerFake: { backgroundColor: c.pink },
  answerText: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.actionL.size,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  answerHint: {
    color: "rgba(11,14,19,0.6)",
    fontFamily: body,
    fontSize: t.beacon.size,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },

  // Recap
  recapRank: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.rank.size,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: t.rank.lineHeight,
  },
  statBlock: { borderTopWidth: 2, borderColor: c.outline, marginTop: 4 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: c.outline,
    paddingVertical: 14,
  },
  statLabel: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.caption.size,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  statValue: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.headline.size,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  statValueHot: { color: c.lime },

  // Reveal / locking / result flash
  suspense: {
    color: c.lime,
    fontFamily: display,
    fontSize: t.suspense.size,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
  },
  lockingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: c.canvas,
  },
  resultFlash: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  resultFlashHit: { backgroundColor: c.lime },
  resultFlashMiss: { backgroundColor: c.pink },
  resultBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resultKicker: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.labelL.size,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
  },
  verdict: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.verdict.size,
    fontWeight: "800",
    letterSpacing: -3,
    textAlign: "center",
    lineHeight: t.verdict.lineHeight,
  },
  reward: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.statement.size,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 14,
  },
  rewardMiss: {
    color: c.onHero,
    fontFamily: body,
    fontSize: t.bodyM.size,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 14,
  },
  streakPill: {
    borderWidth: 3,
    borderColor: c.onHero,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 6,
  },
  streakPillText: {
    color: c.onHero,
    fontFamily: display,
    fontSize: t.labelL.size,
    fontWeight: "800",
    letterSpacing: 2,
  },
  resultActions: { gap: 10 },

  // Review truth row
  truthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  truthLabel: {
    fontFamily: display,
    fontSize: t.label.size,
    fontWeight: "800",
    letterSpacing: 3,
  },
  truthReveal: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.statementTight.size,
    fontWeight: "800",
    lineHeight: t.statementTight.lineHeight,
  },

  // Shutter / paused
  shutterPill: {
    alignSelf: "flex-end",
    borderWidth: 2,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  shutterPillText: {
    color: c.textMuted,
    fontFamily: display,
    fontSize: t.beacon.size,
    fontWeight: "800",
    letterSpacing: 1,
  },
  displayL: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.displayM.size,
    fontWeight: "800",
    lineHeight: t.displayM.lineHeight,
    letterSpacing: -2,
  },
  displayPaused: {
    color: c.textPrimary,
    fontFamily: display,
    fontSize: t.displayL.size,
    fontWeight: "800",
    lineHeight: t.displayL.lineHeight,
    letterSpacing: -2,
  },
});
