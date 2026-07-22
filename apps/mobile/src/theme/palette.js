/**
 * HOT MIC raw palette + WCAG contrast utilities.
 *
 * Plain JS on purpose: this is the single source of hex truth, imported by both
 * `tokens.ts` (typed token layer) and `contrast.test.mjs` (the node --test AA gate,
 * which cannot import a .ts file). Every documented pairing in CONTRAST_PAIRS is
 * asserted to meet WCAG 2.2 AA in both themes.
 */

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Dark is primary (dim-room play). Warm aubergine ground, one marigold signal.
export const dark = {
  canvas: "#170F14",
  surface: "#211722",
  surfaceRaised: "#2E2130",
  outline: "#40304A",
  textPrimary: "#F6ECF3",
  textMuted: "#BBA6C4",
  marigold: "#FFB020", // the one signal (object / large text)
  marigoldFill: "#FFB020", // primary-action fill, always paired with onHero
  onHero: "#1A0E0A",
  payoffRose: "#FF4D8D", // reveal/score crescendo — color-symmetric hit/miss
  statusTeal: "#7FD1C4", // truth treatment — only beside a word + shape
  statusOchre: "#F2A65A", // truth treatment — only beside a word + shape
  safe: "#65D6A6",
  warning: "#F5C451",
  danger: "#FF7A90",
  focusHalo: "#FFE08A",
  focusCore: "#1A0E0A",
};

// Light is a genuine warm-paper scheme, not an inversion. Marigold/rose deepen as
// text; the button fill stays #FFB020 with the dark onHero label in both modes.
export const light = {
  canvas: "#FBF3EC",
  surface: "#F1E4DA",
  surfaceRaised: "#EAD9CB",
  outline: "#D8C6B8",
  textPrimary: "#241017",
  textMuted: "#5C4A55",
  marigold: "#8F5200", // deepened for text on paper (AA)
  marigoldFill: "#FFB020",
  onHero: "#1A0E0A",
  payoffRose: "#C6386E",
  statusTeal: "#1B655A",
  statusOchre: "#8A5012",
  focusHalo: "#8F5200",
  focusCore: "#1A0E0A",
};

// Documented pairings. min 4.5 = normal text; min 3.0 = large/UI (a large payoff
// numeral, a focus indicator, or a truth treatment that always sits beside a word).
export const CONTRAST_PAIRS = [
  // --- dark ---
  { theme: "dark", label: "textPrimary/canvas", fg: dark.textPrimary, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "textMuted/canvas", fg: dark.textMuted, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "textPrimary/surface", fg: dark.textPrimary, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "textMuted/surface", fg: dark.textMuted, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "textPrimary/surfaceRaised", fg: dark.textPrimary, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "textMuted/surfaceRaised", fg: dark.textMuted, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "onHero/marigoldFill", fg: dark.onHero, bg: dark.marigoldFill, min: 4.5 },
  { theme: "dark", label: "payoffRose/canvas (large)", fg: dark.payoffRose, bg: dark.canvas, min: 3.0 },
  { theme: "dark", label: "statusTeal/surfaceRaised", fg: dark.statusTeal, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "statusOchre/surfaceRaised", fg: dark.statusOchre, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "safe/surface", fg: dark.safe, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "warning/surface", fg: dark.warning, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "danger/surface", fg: dark.danger, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "focusHalo/canvas (UI)", fg: dark.focusHalo, bg: dark.canvas, min: 3.0 },
  { theme: "dark", label: "focusCore/marigoldFill (UI)", fg: dark.focusCore, bg: dark.marigoldFill, min: 3.0 },
  // --- light ---
  { theme: "light", label: "textPrimary/canvas", fg: light.textPrimary, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "textMuted/canvas", fg: light.textMuted, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "textPrimary/surface", fg: light.textPrimary, bg: light.surface, min: 4.5 },
  { theme: "light", label: "textMuted/surfaceRaised", fg: light.textMuted, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "onHero/marigoldFill", fg: light.onHero, bg: light.marigoldFill, min: 4.5 },
  { theme: "light", label: "marigold(text)/canvas", fg: light.marigold, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "payoffRose(text)/canvas", fg: light.payoffRose, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "statusTeal/surfaceRaised", fg: light.statusTeal, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "statusOchre/surfaceRaised", fg: light.statusOchre, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "focusHalo/canvas (UI)", fg: light.focusHalo, bg: light.canvas, min: 3.0 },
];
