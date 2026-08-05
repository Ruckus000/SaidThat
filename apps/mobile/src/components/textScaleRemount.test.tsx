import { render } from "@testing-library/react-native";

// Mocked at the module, not spied on the `react-native` namespace: App imports
// `useWindowDimensions` by name, so the binding is captured at module load and a
// later jest.spyOn never sees the call.
const mockUseWindowDimensions = jest.fn(() => ({
  width: 402,
  height: 874,
  scale: 3,
  fontScale: 1,
}));
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseWindowDimensions(...(args as [])),
}));

// The same three seams App.test.tsx mocks, and for the same reasons: the report
// queue and safe-area insets are native modules, and fonts never resolve under the
// test renderer while App gates its whole tree on the loaded flag.
jest.mock("../storage/reportQueue", () => ({
  clearReportQueue: jest.fn(async () => {}),
  queueReport: jest.fn(async () => 1),
  loadQueuedReports: jest.fn(async () => []),
}));

// Same reason as the report queue above: this module binds AsyncStorage at
// import time, and the native module is null under jest.
jest.mock("../storage/playtestStore", () => ({
  updatePlaytestStats: jest.fn(async () => ({ cards: {} })),
  loadPlaytestStats: jest.fn(async () => ({ cards: {} })),
  savePlaytestStats: jest.fn(async () => true),
  clearPlaytestStats: jest.fn(async () => true),
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

import App from "../../App";
import { s } from "./styles";

/**
 * D4 in native-verification-run-2026-08-02.md: changing the system text size while
 * the app is running left text drawn at the new size inside frames measured at the
 * old one — the wordmark showed "SAI", the ticker a stale fragment. A fresh launch
 * was always correct, which is what made it read as a rendering bug.
 *
 * App keys its screens on `fontScale` so they remount and re-measure. jest cannot
 * observe the stale frames themselves (no text measurement — see
 * native-verification-checklist.md), and it cannot read a React key back off the
 * tree either. What it CAN check is that the subscription which drives that key
 * still exists: without `useWindowDimensions`, App never re-renders on a text-size
 * change and the key can never differ.
 *
 * The real verification was on device-class hardware: after the fix, the render
 * following a runtime size change is identical to a fresh launch at that size.
 */

test("app: subscribes to the window text scale, so a size change re-renders it", () => {
  mockUseWindowDimensions.mockClear();
  render(<App />);
  expect(mockUseWindowDimensions).toHaveBeenCalled();
});

test("round: the statement is width-constrained, so its last line wraps instead of clipping", () => {
  // Found while confirming D4 was fixed: at AX1 the quote laid its final line out
  // at intrinsic width and ran past the card — "snacks arrive." rendered as
  // "snacks arri". Present on a fresh launch too, so not stale state.
  expect(s.quote.flexShrink).toBe(1);
  expect(s.person.flexShrink).toBe(1);
});
