import { render, screen } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { SetupScreen } from "./SetupScreen";
import { s } from "./styles";

/**
 * Setup at large text sizes — D5 in native-verification-run-2026-08-02.md, the
 * same class as the round's D1–D3 and fixed the same way: wrap before shrink.
 *
 * Structural for the same reason as RoundScreenScaling: jest has no text
 * measurement, so the clipping and overlap themselves are unobservable here. What
 * broke was the layout contract, and that is what these pin.
 */

const base = {
  mode: MODES.ROOM_BEACON,
  accessRole: "holder",
  motionOptIn: false,
  onMode: () => {},
  onRole: () => {},
  onMotionOptIn: () => {},
  onStart: () => {},
};

test("setup: a choice title wraps inside its card instead of running past the edge", () => {
  // PRIVATE RELAY was clipped mid-word at AX5. The title sits in a row beside the
  // mark; without shrink it kept its intrinsic width and overflowed the card.
  expect(s.choiceTitle.flexShrink).toBe(1);
  expect(s.choiceRow.flexWrap).toBe("wrap");
});

test("setup: the role segment stacks rather than drawing its labels on top of each other", () => {
  // `flex: 1` gave each half a zero basis — always exactly 50%, however wide the
  // label got, so at AX5 the two labels overlapped and neither was readable.
  // An auto basis lets the label's own width decide when the row must wrap.
  expect(s.segment.flexWrap).toBe("wrap");
  expect(s.segmentItem.flexGrow).toBe(1);
  expect(s.segmentItem.flexBasis).toBe("auto");
});

test("setup: the two segment halves stay even at every size that still fits one row", () => {
  // The floor is what keeps an auto basis from making the halves uneven at normal
  // sizes: 48% + 48% fits one row, so both render at half width as they always did.
  expect(s.segmentItem.minWidth).toBe("48%");
});

test("setup: segment labels are inset clear of the capsule's corner radius", () => {
  // Once the control stacks, each row is tall enough that a 999 radius curves
  // through where the label sits, and overflow: hidden cut the ends off it.
  expect(s.segmentItem.paddingHorizontal).toBeGreaterThanOrEqual(20);
});

test("setup: both role options are still offered as radios", () => {
  render(<SetupScreen {...base} />);

  expect(screen.getByRole("radio", { name: /I'M HOLDING/ })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: /SCREEN-FACING/ })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: /ROOM BEACON/ })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: /PRIVATE RELAY/ })).toBeOnTheScreen();
});
