import { render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";

// Mocked at the module for the same reason as textScaleRemount.test.tsx: the hook
// is imported by name, so the binding is captured at module load and jest.spyOn on
// the `react-native` namespace never sees the call.
let mockFontScale = 1;
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 402, height: 874, scale: 3, fontScale: mockFontScale }),
}));

import { HomeScreen } from "./HomeScreen";
import { s } from "./styles";

/**
 * D6 in native-verification-run-2026-08-02.md. On a FRESH launch at accessibility
 * sizes Home rendered its wordmark as "SAI" and its ticker as a blank bar — not
 * stale state, just layout that assumed the text would never grow.
 *
 * Structural, like the round and setup scaling tests: jest has no text measurement,
 * so the clipping itself is unobservable here.
 */

const base = {
  onStart: () => {},
  localFixtures: true,
  reducedMotion: true,
  roundsPlayed: 0,
  correctCount: 0,
  bestStreak: 0,
  runComplete: false,
};

beforeEach(() => {
  mockFontScale = 1;
});

test("home: scrolls, so a hero that outgrows the screen cannot take the rest with it", () => {
  // Was a fixed column: whatever did not fit was simply gone, including the CTA.
  expect(s.home.flexGrow).toBe(1);

  render(<HomeScreen {...base} />);
  expect(screen.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  expect(screen.getByRole("button", { name: /START A ROOM/ })).toBeOnTheScreen();
});

test("home: the wordmark keeps its display size at normal text scales", () => {
  render(<HomeScreen {...base} />);

  const hero = screen.getByText(/SAID/, { exact: false });
  expect(hero.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontSize: s.heroTitle.fontSize })]),
  );
});

test("home: the wordmark drops to the title size when the text scale would overflow", () => {
  // 92pt scaled past ~1.6 is wider than the phone, and homeHero clips rather than
  // wraps — which is how it came to render as "SAI".
  mockFontScale = 1.6;
  render(<HomeScreen {...base} />);

  const hero = screen.getByText(/SAID/, { exact: false });
  expect(hero.props.style).toEqual(expect.arrayContaining([s.heroTitleCompact]));
  expect(s.heroTitleCompact.fontSize).toBeLessThan(s.heroTitle.fontSize as number);
});

test("home: the ticker is measured shrink-wrapped, not against a fixed box", () => {
  // A Text stretches to the width it is given, so the old fixed 5000 box meant
  // onLayout reported 5000 at every text size — the box, never the string. Both
  // copies were then laid out 5000 wide, which at accessibility sizes became a
  // layer too large to rasterise and the strip rendered blank.
  // No assertion that `width` is absent: tsc rejects reading it off this style at
  // all, so putting the fixed box back is a type change, not a silent edit.
  expect(s.tickerMeasure.alignSelf).toBe("flex-start");
  expect(s.tickerText.flexShrink).toBe(0);
});
