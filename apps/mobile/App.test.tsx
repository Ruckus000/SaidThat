import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import App from "./App";

/**
 * The first tests that render App itself.
 *
 * Every bug in the reset chain (#42, #43) lived in App.tsx wiring rather than in
 * a policy module: a missing catch, then a notice shown in a place the platform
 * could drop. Both were invisible to unit tests because the extracted helpers —
 * resetReportsNotice and friends — were individually correct. Only rendering the
 * real component exercises the part that was actually broken.
 */

// The queue is the seam these tests drive: the whole reset flow branches on
// whether device storage cooperates. Mocked per-test rather than globally so a
// test that forgets to arrange it gets the succeeding default, not a surprise.
jest.mock("./src/storage/reportQueue", () => ({
  clearReportQueue: jest.fn(async () => {}),
  queueReport: jest.fn(async () => 1),
  loadQueuedReports: jest.fn(async () => []),
}));

// Fonts never resolve under the test renderer, and App gates its whole tree on
// the loaded flag, so without this every test renders null.
jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

// Safe-area insets come from a native module. The package ships its own mock,
// which supplies fixed frame/insets so SafeAreaProvider resolves synchronously —
// without it the provider renders nothing until it measures, and every query
// below finds an empty tree.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

import { clearReportQueue } from "./src/storage/reportQueue";

const mockClearReportQueue = clearReportQueue as jest.MockedFunction<typeof clearReportQueue>;

/**
 * Alert is a native module: RNTL cannot press its buttons, so the destructive
 * confirm has to be driven by hand. This finds the named button in the most
 * recent Alert.alert call and invokes its onPress, which is what UIKit does.
 *
 * The act() wrap is the exception to the harness rule "never wrap presses in
 * act" — that rule is about RNTL's own helpers, which already wrap. This is a raw
 * callback invoked outside React's event system, and the handler now updates
 * state synchronously, so without it React warns and the assertions race the
 * commit.
 */
function pressAlertButton(spy: jest.SpyInstance, text: string) {
  const calls = spy.mock.calls;
  if (calls.length === 0) throw new Error("no Alert was shown");
  const buttons = calls[calls.length - 1][2] as
    | { text?: string; onPress?: () => void }[]
    | undefined;
  const button = buttons?.find((b) => b.text === text);
  if (!button) throw new Error(`no "${text}" button in the alert`);
  act(() => {
    button.onPress?.();
  });
}

async function openSettings() {
  render(<App />);
  fireEvent.press(await screen.findByLabelText("Open settings"));
  return await screen.findByText("RESET LOCAL SESSION");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockClearReportQueue.mockImplementation(async () => {});
});

test("app: the settings sheet reaches the destructive reset", async () => {
  const reset = await openSettings();
  expect(reset).toBeTruthy();
});


test("app: a clean reset closes settings and says nothing about the queue", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  fireEvent.press(await openSettings());
  pressAlertButton(alert, "Reset");

  // Back on Home, and no notice — a reset that worked does not volunteer a report.
  await waitFor(() => expect(screen.getByText("START A ROOM")).toBeTruthy());
  expect(screen.queryByText(/could not be cleared/i)).toBeNull();
  expect(mockClearReportQueue).toHaveBeenCalledTimes(1);
});

// This is the regression #42 fixed: the await threw, so every state reset below
// it was skipped and the player got nothing after confirming a destructive action.
test("app: a refusing device still completes the reset and reports the queue survived", async () => {
  mockClearReportQueue.mockRejectedValue(new Error("storage unavailable"));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  fireEvent.press(await openSettings());
  pressAlertButton(alert, "Reset");

  // The reset still happened: settings closed, Home is showing.
  await waitFor(() => expect(screen.getByText("START A ROOM")).toBeTruthy());

  // And the half that failed is named, on a surface that cannot be dropped.
  // #43: this was previously a second Alert fired during the confirm alert's
  // dismissal, which iOS discards — so asserting on Home is the point.
  const notice = await screen.findByText(/could not be cleared/i);
  expect(notice).toBeTruthy();
  expect(notice.props.children).toMatch(/stay on this device/i);
  expect(notice.props.children).toMatch(/not sent anywhere/i);
});

// A refusing device was already covered. A device that never ANSWERS was not, and
// a catch is no protection against it: the await simply never returned, so every
// state reset below it was skipped and the confirmed destructive action did
// nothing at all — the same bug this function was written to fix, one layer down.
test("app: a storage backend that never answers cannot cancel the reset", async () => {
  mockClearReportQueue.mockImplementation(() => new Promise(() => {}));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  fireEvent.press(await openSettings());
  pressAlertButton(alert, "Reset");

  // The reset lands immediately — it never waited on storage in the first place.
  await waitFor(() => expect(screen.getByText("START A ROOM")).toBeOnTheScreen());

  // And once the bound expires, the half that did not happen is still reported
  // rather than silently passed off as a clean reset.
  const notice = await screen.findByText(/could not be cleared/i, {}, { timeout: 5000 });
  expect(notice).toHaveTextContent(/stay on this device/i);
}, 10000);

test("app: the reset notice is cleared by starting the next room, not left to linger", async () => {
  mockClearReportQueue.mockRejectedValue(new Error("storage unavailable"));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  fireEvent.press(await openSettings());
  pressAlertButton(alert, "Reset");
  await screen.findByText(/could not be cleared/i);

  fireEvent.press(screen.getByText("START A ROOM"));
  await waitFor(() => expect(screen.queryByText(/could not be cleared/i)).toBeNull());
});
