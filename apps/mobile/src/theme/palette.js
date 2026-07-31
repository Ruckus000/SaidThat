/**
 * VOLT raw palette + WCAG contrast utilities.
 *
 * Plain JS on purpose: this is the single source of hex truth, imported by both
 * `tokens.ts` (typed token layer) and `contrast.test.mjs` (the node --test AA gate,
 * which cannot import a .ts file). Every documented pairing in CONTRAST_PAIRS is
 * asserted to meet WCAG 2.2 AA in both themes.
 *
 * Export keys `marigold` / `marigoldFill` / `payoffRose` are retained as stable
 * aliases for lime signal and pink accent so existing call sites keep working.
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

// Dark is primary (dim-room play). Cool near-black stage, lime signal, pink accent.
export const dark = {
  canvas: "#0B0E13",
  surface: "#11161F",
  surfaceRaised: "#161C27",
  outline: "#2E3A4A",
  textPrimary: "#F2F5F9",
  textMuted: "#9BA6B5",
  textDim: "#5E6A7A",
  lime: "#CDF244",
  limeFill: "#CDF244",
  pink: "#FF4FA0",
  pinkFill: "#FF4FA0",
  onHero: "#0B0E13",
  // Stable aliases — signal lime / accent pink
  marigold: "#CDF244",
  marigoldFill: "#CDF244",
  payoffRose: "#FF4FA0",
  statusTeal: "#7FD1C4",
  statusOchre: "#F0A63C",
  safe: "#65D6A6",
  warning: "#F0A63C",
  danger: "#FF7A90",
  focusHalo: "#CDF244",
  focusCore: "#0B0E13",
};

// Light is a cool paper scheme. Lime/pink deepen as text; fills stay Volt-bright.
export const light = {
  canvas: "#F2F5F9",
  surface: "#E8EDF4",
  surfaceRaised: "#DCE3EE",
  outline: "#C5CEDA",
  textPrimary: "#0B0E13",
  textMuted: "#4A5564",
  textDim: "#5E6A7A",
  lime: "#3A5A00",
  limeFill: "#CDF244",
  pink: "#A0185A",
  pinkFill: "#FF4FA0",
  onHero: "#0B0E13",
  marigold: "#3A5A00",
  marigoldFill: "#CDF244",
  payoffRose: "#A0185A",
  statusTeal: "#1B655A",
  statusOchre: "#8A5012",
  safe: "#1B655A",
  warning: "#8A5012",
  danger: "#A0185A",
  focusHalo: "#3A5A00",
  focusCore: "#0B0E13",
};

// Documented pairings. min 4.5 = normal text; min 3.0 = large/UI.
export const CONTRAST_PAIRS = [
  // --- dark ---
  { theme: "dark", label: "textPrimary/canvas", fg: dark.textPrimary, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "textMuted/canvas", fg: dark.textMuted, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "textPrimary/surface", fg: dark.textPrimary, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "textMuted/surface", fg: dark.textMuted, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "textPrimary/surfaceRaised", fg: dark.textPrimary, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "textMuted/surfaceRaised", fg: dark.textMuted, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "onHero/limeFill", fg: dark.onHero, bg: dark.limeFill, min: 4.5 },
  { theme: "dark", label: "onHero/pinkFill", fg: dark.onHero, bg: dark.pinkFill, min: 4.5 },
  { theme: "dark", label: "lime/canvas (large)", fg: dark.lime, bg: dark.canvas, min: 3.0 },
  // The round streak badge is a 12pt label — bold, but below the WCAG large-text
  // threshold, so it is held to the normal-text bar rather than the UI bar.
  { theme: "dark", label: "lime(pill text)/canvas", fg: dark.lime, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "pink/canvas (large)", fg: dark.pink, bg: dark.canvas, min: 3.0 },
  { theme: "dark", label: "statusTeal/surfaceRaised", fg: dark.statusTeal, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "statusOchre/surfaceRaised", fg: dark.statusOchre, bg: dark.surfaceRaised, min: 4.5 },
  { theme: "dark", label: "safe/surface", fg: dark.safe, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "warning/surface", fg: dark.warning, bg: dark.surface, min: 4.5 },
  // The reset notice on Home sits on canvas, not on a surface panel.
  { theme: "dark", label: "warning/canvas", fg: dark.warning, bg: dark.canvas, min: 4.5 },
  { theme: "dark", label: "danger/surface", fg: dark.danger, bg: dark.surface, min: 4.5 },
  { theme: "dark", label: "focusHalo/canvas (UI)", fg: dark.focusHalo, bg: dark.canvas, min: 3.0 },
  { theme: "dark", label: "focusCore/limeFill (UI)", fg: dark.focusCore, bg: dark.limeFill, min: 3.0 },
  // --- light ---
  { theme: "light", label: "textPrimary/canvas", fg: light.textPrimary, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "textMuted/canvas", fg: light.textMuted, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "textPrimary/surface", fg: light.textPrimary, bg: light.surface, min: 4.5 },
  { theme: "light", label: "textMuted/surfaceRaised", fg: light.textMuted, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "onHero/limeFill", fg: light.onHero, bg: light.limeFill, min: 4.5 },
  { theme: "light", label: "onHero/pinkFill", fg: light.onHero, bg: light.pinkFill, min: 4.5 },
  { theme: "light", label: "lime(text)/canvas", fg: light.lime, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "pink(text)/canvas", fg: light.pink, bg: light.canvas, min: 4.5 },
  { theme: "light", label: "statusTeal/surfaceRaised", fg: light.statusTeal, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "statusOchre/surfaceRaised", fg: light.statusOchre, bg: light.surfaceRaised, min: 4.5 },
  { theme: "light", label: "focusHalo/canvas (UI)", fg: light.focusHalo, bg: light.canvas, min: 3.0 },
  { theme: "light", label: "warning/canvas", fg: light.warning, bg: light.canvas, min: 4.5 },
];
