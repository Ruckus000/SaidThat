import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { render, screen } from "@testing-library/react-native";

import { Root } from "./Root";

/**
 * Root is the composition that actually gets registered, and both layers it adds
 * are invisible from App's own tests — which render `<App/>` directly on purpose,
 * so a throw fails the test loudly instead of being caught by the boundary.
 * This covers the wrapper those tests deliberately skip.
 */

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

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
}));

jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock").default;
  return { ...mock, initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } };
});

test("root: the app renders inside a safe-area provider", () => {
  render(<Root />);

  expect(screen.UNSAFE_getByType(SafeAreaProvider)).toBeTruthy();
  // And the app is really below it, not merely alongside.
  expect(screen.getByText("START A ROOM")).toBeOnTheScreen();
});

// The substantive half of this fix. Without initialMetrics the provider seeds
// insets to null and renders NOTHING until the native event lands, so the first
// frame of a cold start is blank. initialWindowMetrics is read synchronously from
// TurboModule constants at startup, so passing it removes that frame.
test("root: the provider is seeded with the metrics available at startup", () => {
  render(<Root />);

  const provider = screen.UNSAFE_getByType(SafeAreaProvider);
  expect(provider.props.initialMetrics).toBe(initialWindowMetrics);
  expect(provider.props.initialMetrics).not.toBeNull();
});
