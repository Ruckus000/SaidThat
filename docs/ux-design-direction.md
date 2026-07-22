# UX Design Direction — "HOT MIC"

**Scope:** `apps/mobile` visual/interaction system
**Status:** Approved direction; delivered in phases (this doc + Phase 0 land the foundation).
**Supersedes:** the visual language only. It does **not** relax any misinformation-safety,
privacy, tap-only, reduced-motion, or accessibility guardrail — those are load-bearing and
unchanged. See also [`ux-audit-summary.md`](ux-audit-summary.md) for the earlier fun/UX pass.

> How this was chosen: a research-led, multi-agent design workflow (7 research lenses → 3
> competing identities → judge → synthesis → adversarial critique → finalize). The critique
> caught a false foundational premise (the app does **not** ship Reanimated) and four
> color/safety slips; all were resolved before this became the plan.

---

## Thesis

A game about whether words are real makes the **words** — and the quotation mark that frames
them — the art direction. We replace the flat graphite-and-lime template with a warm
**aubergine-plum stage lit from within by a single marigold signal**: a night-out temperature
that glows kindly in the dim rooms this game is actually played in (the one aesthetic claim we
defend functionally — warm dark measurably reduces glare/halation versus cool dark or bright
white). The bold layer is **purely additive**; underneath it, every truth is always a plain
word plus a non-color shape at identical weight.

## Three signature moves

1. **THE MARK** — a bespoke `react-native-svg` quotation-glyph family (open / close /
   dashed-attribution / selection-dot / status-spoken / status-struck) that is the app's *own*
   shape language, not a licensed font's glyphs, so identity survives a font swap. It is the
   beacon (a breathing open-quote behind the statement, legible by shape alone with color and
   motion off), the spotlight at reveal, and the seal (the closing quote drops to close a
   **round** — "round closed," never "verified"). It contains **no checkmark** and never encodes
   truth.
2. **THE KICK** — a two-beat commit spring (dip → overshoot → settle) paired with a
   Light-then-Medium haptic doublet, fired on **exactly one** action: the game answer-commit.
   Rare on purpose, so it stays meaningful in the hand for pass-and-play and forehead play.
3. **THE STRUCK VERDICT** — at reveal, the truth word + its non-color shape land as a
   lightweight letterpress deboss. The always-shipping path is flat heavy-weight + shape; the
   deboss is progressive enhancement on one element, never a dependency of the truth contract.

---

## Color

Warm-graphite tonal system, dark-primary (not dark-only). One aubergine-plum hue family; light
mode is a genuine warm-paper scheme, not an inversion. **The hard rule:** marigold marks
current-action / current-context **only** — at most one lit element per screen — and
multi-selection (selected cards, ON toggles) uses a **neutral** plum treatment, so list screens
never become "marigold soup." `payoffRose` is **color-symmetric**: the same hue appears on a hit
and a miss, scaled by magnitude only, so correctness is never legible from color.

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#170F14` | Warm aubergine ink app background (not black) |
| `surface` | `#211722` | Resting card/row (+7% L, a real step) |
| `surfaceRaised` | `#2E2130` | Hero panel · **neutral** multi-selection wash |
| `outline` | `#40304A` | Hairlines, dividers, unselected control borders |
| `textPrimary` | `#F6ECF3` | Warm off-white (~15:1 on canvas), never pure `#FFF` |
| `textMuted` | `#BBA6C4` | Supporting text (~8.5:1) |
| `marigold` | `#FFB020` | The one signal: primary CTA / live context (emitted light) |
| `onHero` | `#1A0E0A` | Dark label on marigold (~10.6:1) |
| `payoffRose` | `#FF4D8D` | Reveal/score crescendo; color-symmetric hit/miss |
| `statusTeal` | `#7FD1C4` | Truth *treatment* — only ever beside a word + shape |
| `statusOchre` | `#F2A65A` | Truth *treatment* — only ever beside a word + shape |
| `focusHalo` / `focusCore` | light / `#1A0E0A` | Dual-tone focus ring (visible on marigold fills) |

Contrast is documented per-token for **both** themes at the worst pixel, including small
microcopy (≈13pt) and the two truth treatments on `surfaceRaised`. Marigold/rose are
large/bold/UI-only for body-length copy to avoid halation on warm ink.

## Typography

Two voices. A **variable grotesque** (optical-size axis, loaded via `expo-font`) carries display
drama — headlines, the hero pull-quote framing, the verdict word — and is explicitly
**subordinate and swappable** (identity rests on THE MARK, not a fashionable font). **Inter
Variable** carries every functional surface *and owns the counters* (tabular figures via
`fontFeatureSettings`, not the display face), so the score roll-up is solid, not a gamble.

A modular ramp replaces the current 3-size system: `displayXL 56 / displayL 40 / statement
46→28 (auto-shrink, unclamped in a min-height ScrollView) / verdict 40 / title 24 / body 18 /
label 15 (neutral tone) / caption 13`. **Dynamic Type is preserved** — `allowFontScaling` stays
on; the verdict "swell" is a scale/opacity transform on a fixed-weight glyph (not a live weight
axis), verified at iOS AX-max and Android font-scale 2.0 with Bold Text on. Render is gated on
the font `loaded` flag with a system-face fallback so text never renders invisible.

## Depth & motion

Depth is **tonal + emissive**, never shadow-spam: a 4-step surface ramp, and one lit element per
screen via a `react-native-svg` `RadialGradient` bloom (reduce-transparency-gated to a solid
fill). **Motion runs on core RN `Animated`** (`useNativeDriver`, proven in-repo by `FadeIn`) —
**no Reanimated**. Four named spring presets are the whole vocabulary: `SNAPPY` (taps, toggles,
Home Play), `STANDARD` (stage transitions), `WEIGHTY` (reveal seal, shutter), and the signature
`KICK`. The KICK's haptic doublet fires on **discrete gesture phases** (not spring-value
thresholds). Reduced motion reaches a **layout- and semantics-identical** end state (testable by
resolved-style equality); nothing is ever gated on an animation finishing.

## Component library (one control language)

Every core component is specced with anatomy, **all applicable states** (default / pressed /
selected / disabled / focus / loading / error), sizing (56dp targets; `hitSlop` on controls,
dead margins on the statement panel for forehead play), motion + haptic pairing, and a11y.

- **Primary button** — one per screen; marigold fill + emissive bloom; pressed = `SNAPPY` dip +
  bloom intensifies (no fake shadow ledge); disabled drops bloom + saturation + haptic;
  dual-tone focus ring on the fill; in-place loading spinner.
- **Secondary button** — surface fill + outline, no bloom; a clear step down; never marigold.
- **The two answer controls** — one shared neutral style; **neither** carries marigold; both
  fire the identical KICK + haptic doublet (parity-tested); committed = plum fill + a
  **verdict-neutral** selection mark (never a check) while the other **recedes ≥8%** (opacity +
  scale); a defined mid-commit-interrupt state.
- **Selectable choice card** — whole-card target; selected = **neutral** plum wash + heavier
  outline + neutral pick mark (three grayscale-robust channels), never marigold.
- **Canonical ToggleRow** — one row app-wide; ON = **neutral** lightened-plum track + thumb +
  ON/OFF text pill (never color alone).
- **Statement / hero card** — surfaceRaised panel, breathing MARK beacon, min-height ScrollView
  so max Dynamic Type never clips the punchline; defined loading / empty-degraded states.
- **Header + score** — Inter tabular count-up; a **single** a11y channel (no double-read).
- **Mark / badge system** — the bespoke SVG glyph family + text-first StatusPills (word + a
  distinct non-check shape; color only reinforces).
- **Off-ramp frame** (Private Relay shutter / Paused / Content Unavailable) — full-screen;
  designed empty states; hold-to-confirm whose **tap alternative is the default under an active
  assistive technology**.
- **Report control** — minimized, bounded, text-first, in a core RN `Modal` (no bottom-sheet
  dep).
- **Recap stat card** — a scoreboard (tabular hero number + cascading rows), not a settings list.

## The reveal (choreography, identical timing regardless of authenticity)

Held ~700ms settling beat (beacon breathes; committed side shows a verdict-neutral dot) →
`WEIGHTY` closing-quote **seal** ("round closed") → dim-to-spotlight (static overlay) →
flat-primary **struck verdict** (word + non-color shape first; specular sweep only where
supported, **suppressed under Reduce Motion**) → attribution staggers → score climbs in
`payoffRose` using the **same hue for a hit or a miss**. A miss is the same warm vocabulary at
lower intensity — never red, never confetti, never punishment.

## Dependencies (the honest foundation)

The app ships only `expo-haptics` + `expo-sensors`; the signature moves need libraries it does
not have. We add **exactly two** core deps — **`react-native-svg`** (THE MARK + radial bloom)
and **`expo-font`** (the variable + Inter faces) — and drive all motion on core RN `Animated`.
We deliberately do **not** add Reanimated (New-Arch babel-plugin risk), expo-linear-gradient
(linear-only, can't do the radial bloom), expo-blur (optional glass), or `@gorhom/bottom-sheet`
(a core `Modal` covers the bounded report).

## Guardrails (unchanged, engineered in)

Authenticity is always a plain word + a non-color, **non-check** shape at identical weight for
both outcomes; the two treatment colors are grayscale-separable and never appear without the
word; marigold/payoffRose are structurally forbidden from mapping to a verdict; the reveal seals
a **round**, never certifies a fixture. No red-vs-green, no color-only status. No public-figure
imagery, impersonation, or post/feed facsimile. No confetti tied to a verdict; a miss is never
punishment. Tap-only is first-class; no countdown/shake/tilt requirement; reduced motion reaches
an identical resting end state with identical haptics + word + shape + announcement. Local-first
fixture MVP; holder privacy + Private Relay shutter recovery + discard-on-interrupt + minimized
bounded reports preserved. WCAG 2.2 AA documented per-token for both themes; Dynamic Type
preserved; dual-tone focus ring; 56dp targets; single a11y announce channel; assistive-tech tap
default for hold-to-confirm.

## Build plan (phased, each its own gated PR)

- **Phase 0 — foundation (this PR):** this doc + add `react-native-svg` and `expo-font`
  (SDK-pinned); prove typecheck / tests / `expo export` / DesignOps stay green. No visual change;
  deps are not yet consumed. *Native-module runtime integration (SVG render, on-device font
  load) remains a release/native-verification task per the demo spec — the JS gates prove
  install + typecheck + bundle, not the native build.* The `expo-font` SplashScreen load-gate is
  deferred to Phase 1, where the actual font files arrive.
- **Phase 0.5 — tokens:** rewrite `apps/mobile/src/theme/tokens.ts` to the tonal system + the
  four spring presets; keep `.designops/08-design-system/tokens.json` in lockstep; add a
  both-themes contrast check.
- **Phase 1 — type + motion + haptics infra:** load faces (gated + fallback); build THE MARK as
  SVG; a `fireEvent()` core uniting press + haptic + hitSlop + reduced-motion; the four springs +
  KICK on discrete phases; the emissive bloom.
- **Phase 2 — component library:** one control language, every state, parity + reveal-copy
  deep-equality tests in the existing `node --test` harness.
- **Phase 3 — the reveal choreography.**
- **Phase 4–5 — screen application, the shutter-wipe, the light theme, and the accessibility +
  performance pass** (AA both themes at the worst pixel, Dynamic Type at max with Bold Text,
  focus rings, reduced-motion/transparency branches), gated by the standard suite.

## Key risks

New deps must be New-Arch-compatible for React 19.2 / RN 0.86 / Expo 57 (Phase 0 gate-tests them
first). The deboss has no true RN inner shadow → the flat weight+shape treatment is the primary
path. Color creep could read as a verdict → the reserved-marigold rule + color-symmetric rose +
deep-equality tests assert no hue maps to authenticity. Emissive bloom/grain can band or cost
battery on OLED → static SVG radial (no WebGL), one bounded zone, reduce-transparency fallbacks.
It is a large refactor → the phased, gated plan re-verifies fixture-only / local-first / privacy
/ truth-label guardrails at every step.
