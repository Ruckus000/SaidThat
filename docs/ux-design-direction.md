# UX Design Direction — "VOLT"

**Scope:** `apps/mobile` visual/interaction system
**Status:** Approved direction; delivered. Supersedes the earlier **HOT MIC** direction
(warm aubergine + marigold), which shipped in phases 0–2e and was reskinned in Phase 3.
**Supersedes:** the visual language only. It does **not** relax any misinformation-safety,
privacy, tap-only, reduced-motion, or accessibility guardrail — those are load-bearing and
unchanged. See also [`ux-audit-summary.md`](ux-audit-summary.md) for the earlier fun/UX pass.

> How this was chosen: HOT MIC established the structural system (THE MARK, THE KICK, the
> reveal choreography, the token layer, the AA gate). VOLT is a **reskin on that skeleton**,
> prototyped end-to-end as an interactive 10-stage mockup (`Volt Prototype.dc.html`, Claude
> Design project "Headsup-style UX redesign explorations") and then reconciled against the
> shipping app screen by screen.

---

## Thesis

A game about whether words are real makes the **words** — and the quotation mark that frames
them — the art direction. HOT MIC's warm aubergine stage read as intimate but muted; VOLT
trades it for a **cool near-black stage carrying a single electric charge**. The canvas
recedes to almost nothing so the lime does all the work: it is the wordmark, the CTA, the lit
prompt card, and the badge on a running streak. Where HOT MIC glowed, VOLT *snaps*.

The bold layer is still **purely additive**; underneath it, every truth is always a plain
word plus a non-color shape at identical weight.

## Three signature moves (unchanged from HOT MIC)

1. **THE MARK** — a bespoke `react-native-svg` quotation-glyph family (open / close /
   selection-dot / status-spoken / status-struck / spark) that is the app's *own* shape
   language, not a licensed font's glyphs, so identity survives a font swap. It is the beacon
   behind the statement, the spotlight at reveal, and the seal that closes a **round** —
   "round closed," never "verified." It contains **no checkmark** and never encodes truth
   alone.
2. **THE KICK** — a two-beat commit spring (dip → overshoot → settle) paired with a
   Light-then-Medium haptic doublet, fired on **exactly one** action: the game answer-commit.
   Rare on purpose, so it stays meaningful in the hand for pass-and-play.
3. **THE STRUCK VERDICT** — at reveal, the outcome word lands as a spring-stamped display
   glyph over a full-bleed field, rotated off-axis. The always-shipping path is flat
   heavy-weight + MARK glyph + word.

---

## Color

Cool near-black tonal system, dark-primary (not dark-only). Light mode is a genuine cool-paper
scheme, not an inversion — it is defined and AA-verified in `palette.js` but not yet consumed.

**The hard rule (revised):** lime marks current-action / current-context — **one lime signal
per screen** — and **pink marks the opposing answer and the miss**. Pink is a first-class
secondary in VOLT, not a rare crescendo. Multi-selection (selected cards, ON toggles) uses the
lime treatment at reduced weight, and unselected options drop to 55% opacity rather than
taking a second hue.

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#0B0E13` | Cool near-black app background (not pure black) |
| `surface` | `#11161F` | Resting card/row |
| `surfaceRaised` | `#161C27` | Hero panel |
| `outline` | `#2E3A4A` | Hairlines, dividers, unselected control borders |
| `textPrimary` | `#F2F5F9` | Cool off-white (~15:1 on canvas), never pure `#FFF` |
| `textMuted` | `#9BA6B5` | Supporting text |
| `textDim` | `#5E6A7A` | Footnotes, disclosures, the pause link |
| `lime` / `limeFill` | `#CDF244` | The signal: primary CTA / live context / SAID IT |
| `pink` / `pinkFill` | `#FF4FA0` | Secondary: TOTAL LIE, the miss flash, destructive |
| `onHero` | `#0B0E13` | Dark label on a lime or pink fill |
| `statusTeal` / `statusOchre` | `#7FD1C4` / `#F0A63C` | Supporting detail — only ever beside a word |
| `focusHalo` / `focusCore` | `#CDF244` / `#0B0E13` | Dual-tone focus ring (visible on lime fills) |

`marigold` / `marigoldFill` / `payoffRose` remain in `palette.js` as **stable aliases** for
lime / limeFill / pink so call sites written against HOT MIC keep working.

Contrast is documented per-token for **both** themes at the worst pixel in `CONTRAST_PAIRS`
and asserted by `contrast.test.mjs`. Note that lime-on-canvas is documented **twice** — at the
3.0 UI/large bar and again at the 4.5 normal-text bar — because the round streak badge is a
12pt label, which is bold but below the WCAG large-text threshold.

### What changed from HOT MIC, and why it is still safe

HOT MIC required `payoffRose` to be **color-symmetric**: the same hue on a hit and a miss, so
"correctness is never legible from color." **VOLT drops that rule.** A hit flashes lime, a
miss flashes pink.

This is a deliberate, bounded relaxation, and it is worth being precise about what it does and
does not touch:

- What is now color-coded is **game outcome** — did the player read the room correctly. That
  is a skill result, and it is *supposed* to feel different when you win.
- What is **not** color-coded alone is **authenticity**. The truth contract is untouched:
  every truth state carries a plain word (`SIMULATED AUTHENTIC · THEY "SAID" IT` /
  `FABRICATED FOR THIS GAME`) plus a distinct non-color MARK glyph (`spoken` / `struck`), and
  `uiState.test.mjs` asserts both that the words differ and that the glyphs differ.
- Each outcome additionally carries its own **word**, **kicker**, and **glyph** — `NAILED IT!`
  / "THE ROOM CALLED IT" / `close`, versus `FOOLED YA.` / "THE ROOM GOT PLAYED" / `struck`. A
  player who cannot distinguish lime from pink loses nothing.
- The miss stays non-punishing: same type scale, same layout, same reward line position, and
  copy that points at the truth rather than the player ("Streak reset. The truth is one tap
  away."). No red, no confetti, no blame.

## Typography

Two voices. **Bricolage Grotesque** carries display drama — the wordmark, headlines, the hero,
the verdict word, and every pill label — and is explicitly **subordinate and swappable**
(identity rests on THE MARK, not a fashionable font). **Inter Variable** carries every
functional surface *and owns the counters* (tabular figures), so the score roll-up is solid.

The modular ramp bakes size + lineHeight + weight + tracking per role, so no component
reconstructs a scale by arithmetic: `displayXL 92 / displayL 58 / verdict 96 / title 44 /
statement 34→28 (auto-shrink on long quotes) / body 17 / label 14 / caption 13`.

CTAs use a deliberately coarse **three-step scale** — hero 22 (the one action that opens a
stage), default 20, secondary 18 — rather than reproducing the prototype's per-screen sizes.

Dynamic Type is preserved (`allowFontScaling` stays on). Render is gated on the font `loaded`
flag with a system-face fallback so text never renders invisible.

## Depth & motion

Depth is **tonal + emissive**, never shadow-spam: lime glow shadows on the lit element,
2–3px outlines, and pill radii. **Motion runs on core RN `Animated`** (`useNativeDriver`) —
**no Reanimated**. Four named spring presets are the whole vocabulary: `SNAPPY`, `STANDARD`,
`WEIGHTY`, and the signature `KICK`. Reduced motion reaches a **layout- and
semantics-identical** end state; nothing is ever gated on an animation finishing.

Named durations: `quick 120 / travel 240 / stamp 450 / locking 850`. The `locking` beat is a
**post-commit** anticipation hold — the tap is already registered, so it never makes tap-play
second-class and never functions as an answer countdown.

## Chrome

The shared header (wordmark + score pill + gear) carries Home, Setup, Review, Shutter and
Paused. Three stages drop it:

- **Round** replaces it with its own context row — round count on the left, and on the right a
  lit streak badge once a streak is running, otherwise the plain score. Under Private Relay the
  pill reads `PRIVATE HANDOFF` and conceals both, so a passed phone leaks neither the score nor
  the streak that implies it.
- **Result** goes full-bleed for the flash, with no gutters at all.
- **Recap** opens directly on the spark MARK.

## The reveal (choreography, identical timing regardless of authenticity)

Held 850ms locking beat (pulsing selection dot + `LOCKING IT IN…`) → full-bleed flash in lime
(hit) or pink (miss) → MARK glyph rises → kicker → spring-stamped verdict word, scaled 2.2→1
and rotated off-axis → reward line → streak pill. Reduced motion skips straight to the verdict
with the identical words, glyph, and reward.

## Guardrails (unchanged, engineered in)

Authenticity is always a plain word + a non-color, **non-check** shape at identical weight for
both outcomes; the treatment colors are grayscale-separable and never appear without the word;
no hue maps to authenticity **on its own**; the reveal seals a **round**, never certifies a
fixture. No red-vs-green. No public-figure imagery, impersonation, or post/feed facsimile. No
confetti tied to a verdict; a miss is never punishment. Tap-only is first-class; no
countdown/shake/tilt requirement; reduced motion reaches an identical resting end state with
identical haptics + word + shape + announcement. Local-first fixture MVP; holder privacy +
Private Relay shutter recovery + discard-on-interrupt + minimized bounded reports preserved.
WCAG 2.2 AA documented per-token for both themes; Dynamic Type preserved; dual-tone focus
ring; 56dp targets; single a11y announce channel.

## Delivery history

- **Phase 0** — foundation: direction doc, `react-native-svg` + `expo-font` (SDK-pinned).
- **Phase 0.5** — token layer + the both-themes contrast gate.
- **Phase 1** — faces loaded; THE MARK as SVG; `useFireEvent` uniting press + haptic +
  hitSlop + reduced-motion; the four springs + KICK.
- **Phase 2 (a–e)** — component library, THE MARK on the round beacon, the KICK on the answer
  controls, the closing MARK seal on the reveal, retire the legacy tokens export.
- **Phase 3** — **VOLT.** Reskin to the cool/lime/pink system, the chrome split above, the
  three-step CTA scale, and the `hotmic` → `volt` token rename.

## Key risks

Color creep could read as a verdict → the one-lime-signal rule plus the word + MARK assertions
in `uiState.test.mjs` keep authenticity legible without color. Lime is a high-luminance hue on
a near-black stage and can halate → it is held to large/bold/UI sizing for anything longer than
a label, and documented at the normal-text bar wherever it is used at 12–14pt.
