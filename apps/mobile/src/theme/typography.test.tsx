import { FONT_FAMILY, typeStyle } from "./typography";
import { s } from "../components/styles";

/**
 * The font seam, and the shape of the thing that is NOT implemented.
 *
 * typography.ts used to claim "a system-face fallback on error, so text never
 * renders in a missing font". There is no such fallback. These tests pin why it
 * is not a one-line addition, so the claim cannot quietly come back as a comment
 * without the code behind it.
 *
 * `.test.tsx` because typography.ts is TypeScript and the node --test layer
 * cannot import it.
 */

test("typography: typeStyle reads the family per call, so it would honour a fallback", () => {
  const before = typeStyle("displayL").fontFamily;
  expect(before).toBe(FONT_FAMILY.display);

  // The working half of the seam: clear the family and the next call reflects it.
  const original = FONT_FAMILY.display;
  try {
    delete FONT_FAMILY.display;
    // No fontFamily key at all, rather than an undefined one — the spread is
    // conditional, which is what lets the platform pick the face.
    expect(typeStyle("displayL")).not.toHaveProperty("fontFamily");
  } finally {
    FONT_FAMILY.display = original;
  }
});

// This is the reason the fallback is a refactor rather than an assignment, and
// the reason the old comment was false. If someone makes the stylesheet dynamic,
// this test fails — and that is the moment to restore the claim, with the code.
test("typography: the stylesheet froze the family at import, so reassignment cannot reach it", () => {
  const original = FONT_FAMILY.display;
  try {
    delete FONT_FAMILY.display;

    // styles.ts copied FONT_FAMILY into module-scope consts and handed them to
    // StyleSheet.create once. Nothing re-reads them, so every declaration still
    // names the face that failed to load.
    expect(s.title).toHaveProperty("fontFamily", original);
    expect(s.heroTitle).toHaveProperty("fontFamily", original);
  } finally {
    FONT_FAMILY.display = original;
  }
});
