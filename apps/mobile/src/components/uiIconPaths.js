/**
 * UI chrome icons — deliberately separate from THE MARK.
 *
 * THE MARK (`markPaths.js`) is the app's identity language and carries meaning:
 * its family invariants are asserted, and nothing in it may read as "correct" or
 * "verified". These are plain functional affordances (settings, navigation) with
 * no semantic weight, so they live apart and are never used to express state.
 *
 * Pure path data so the node --test harness can check them without a renderer.
 * All icons share one viewBox and are drawn as filled shapes with evenodd, so a
 * single `fill` colors them and no stroke scaling is needed.
 */
export const UI_ICON_VIEWBOX = "0 0 100 100";

export const UI_ICON_PATHS = {
  // 8-tooth gear with a counter-drawn hub (evenodd). Generated geometrically
  // rather than hand-tuned, so the teeth stay evenly spaced at any size.
  gear:
    "M81.0,38.7 L95.0,40.4 L95.0,59.6 L81.0,61.3 L79.9,63.9 L88.6,75.1 " +
    "L75.1,88.6 L63.9,79.9 L61.3,81.0 L59.6,95.0 L40.4,95.0 L38.7,81.0 " +
    "L36.1,79.9 L24.9,88.6 L11.4,75.1 L20.1,63.9 L19.0,61.3 L5.0,59.6 " +
    "L5.0,40.4 L19.0,38.7 L20.1,36.1 L11.4,24.9 L24.9,11.4 L36.1,20.1 " +
    "L38.7,19.0 L40.4,5.0 L59.6,5.0 L61.3,19.0 L63.9,20.1 L75.1,11.4 " +
    "L88.6,24.9 L79.9,36.1 Z " +
    "M35,50 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0 Z",
};

export function uiIconNames() {
  return Object.keys(UI_ICON_PATHS);
}
