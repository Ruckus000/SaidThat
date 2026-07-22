/**
 * THE MARK — the bespoke quotation-glyph family (HOT MIC signature).
 *
 * Pure SVG path data so the node --test harness can verify the family's invariants
 * (see markPaths.test.mjs); the RN wrapper lives in Mark.tsx. All glyphs share one
 * viewBox and are legible by shape alone. There is deliberately NO check/tick glyph:
 * nothing in the mark language may read as "correct" or "verified".
 */
export const MARK_VIEWBOX = "0 0 100 100";

export const MARK_PATHS = {
  // Opening quotation pair — the beacon behind the statement.
  open:
    "M20,58 C20,40 32,28 48,26 L44,37 C36,39 32,45 32,51 L45,51 L45,73 L20,73 Z " +
    "M55,58 C55,40 67,28 83,26 L79,37 C71,39 67,45 67,51 L80,51 L80,73 L55,73 Z",
  // Closing quotation pair — the reveal seal ("round closed", never "verified").
  close:
    "M80,42 C80,60 68,72 52,74 L56,63 C64,61 68,55 68,49 L55,49 L55,27 L80,27 Z " +
    "M45,42 C45,60 33,72 17,74 L21,63 C29,61 33,55 33,49 L20,49 L20,27 L45,27 Z",
  // Verdict-neutral selection mark (never a check) — pre-reveal commit.
  selectionDot: "M50,36 A14,14 0 1,0 50.01,36 Z",
  // AUTHENTIC treatment — a 'spoken' open bracket (paired with the word, never alone).
  spoken: "M66,22 L42,22 L42,78 L66,78 L66,70 L50,70 L50,30 L66,30 Z",
  // FABRICATED treatment — a 'struck' bar.
  struck: "M22,46 L78,46 L78,54 L22,54 Z",
  // Streak spark — grows with the streak (retires the emoji).
  spark: "M50,16 L58,42 L84,50 L58,58 L50,84 L42,58 L16,50 L42,42 Z",
};

export function markNames() {
  return Object.keys(MARK_PATHS);
}
