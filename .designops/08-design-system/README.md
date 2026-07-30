# Design system

**Status:** Implemented — VOLT direction, shipped in `apps/mobile`.

The approved direction is [`docs/ux-design-direction.md`](../../docs/ux-design-direction.md)
("VOLT", superseding "HOT MIC"). Tokens are no longer hypotheses.

## Sources of truth

| Layer | File | Notes |
|---|---|---|
| Direction | `docs/ux-design-direction.md` | Thesis, color rules, guardrails |
| Tokens (spec) | `tokens.json` (this directory) | DTCG-shaped mirror of what ships |
| Tokens (code) | `apps/mobile/src/theme/tokens.ts` | The `volt` export — the sole token layer |
| Color hexes | `apps/mobile/src/theme/palette.js` | Plain JS so the AA test can import it |
| Shared styles | `apps/mobile/src/components/styles.ts` | The only `StyleSheet` in the app |

`tokens.json` carries two blocks: a generic base block and a `volt` block that mirrors
`tokens.ts` key-for-key. Both describe the same shipped system — keep them in lockstep when
either changes.

## Enforced contracts

These are machine-checked, not aspirational. Run them from the repository root:

```bash
npm --prefix apps/mobile test
```

- **`apps/mobile/src/theme/contrast.test.mjs`** — every pairing in `CONTRAST_PAIRS` meets its
  WCAG 2.2 AA target in **both** themes (4.5 normal text / 3.0 large + UI). Any new color
  pairing must be added there or it ships unverified.
- **`apps/mobile/src/components/uiState.test.mjs`** — every truth and status state reads as
  words plus a non-color cue: distinct labels *and* distinct MARK glyphs for authentic vs
  fabricated, `ON`/`OFF` text on toggles, and score concealment under Private Relay.
- **`apps/mobile/src/components/markPaths.test.mjs`** — the MARK glyph family shares one
  viewBox and contains no check glyph; nothing in the mark language may read as "correct" or
  "verified."
- **`apps/mobile/src/components/uiIconPaths.test.mjs`** — UI chrome icons (the settings gear)
  are well-formed filled paths, and their namespace stays disjoint from THE MARK so a plain
  affordance can never drift into the vocabulary that expresses game state.
- **No typed glyphs.** Icons are drawn as SVG, never written as characters — emoji and dingbats
  (`⚙ ✦ ◆ ○`) render inconsistently across devices and can degrade to a missing-glyph box, which
  would silently break a non-color cue. `uiState.test.mjs` fails if one appears in a label.

## Not covered

There is no React renderer in the test harness, so no component is asserted visually — layout
and style composition are verified by review and by the screenshots in
`apps/mobile/screenshots/`. Native rendering (SVG, on-device font load, Dynamic Type at max)
remains a release/native-verification task per the demo spec.
