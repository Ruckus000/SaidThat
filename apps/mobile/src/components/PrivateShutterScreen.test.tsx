import { ScrollView, Text } from "react-native";
import { userEvent, render, screen } from "@testing-library/react-native";

import { PrivateShutterScreen } from "./PrivateShutterScreen";

/**
 * THE RENDER-TEST PATTERN — defined here, followed by every later screen test.
 *
 * Why these tests exist at all: every bug fixed in this codebase recently lived in
 * the React layer, not in the pure modules. The extracted policy functions were
 * individually correct while the screen wiring was wrong. Label-level assertions
 * cannot see that class of defect; rendering can.
 *
 * The rules:
 *  1. Query by what a user or assistive technology perceives, in this priority:
 *     getByRole -> getByLabelText -> getByText. queryBy* for absence, findBy* for
 *     async. testID is a last resort — it asserts implementation, not experience.
 *  2. Use the matchers RNTL 13.3.3 registers itself (toBeOnTheScreen, toBeVisible,
 *     toHaveAccessibleName, toHaveAccessibilityState). Do NOT add
 *     @testing-library/jest-native; it is deprecated and its matchers are built in.
 *  3. await userEvent.press(...) even where fireEvent would work synchronously —
 *     free forward-compatibility with RNTL 14's async-by-default render.
 *  4. Never jest.mock("react-native") wholesale. Mock at the module path
 *     (expo-sensors, expo-font, ./src/storage/reportQueue, ...) so the real
 *     component tree still renders.
 *  5. Never wrap render or press in act() — RNTL does it, and doing it twice is
 *     what produces the "overlapping act" warnings people then silence.
 *  6. Fault injection is a mock that returns new Promise(() => {}) (never settles),
 *     throws, or mockRejectedValue. Assert the user-visible degraded state, never
 *     the error object — the question is always "what does the player see".
 */

test("private shutter: the handoff ritual renders with its one action", async () => {
  const onReady = jest.fn();
  render(<PrivateShutterScreen onReady={onReady} />);

  expect(screen.getByText("PRIVATE HANDOFF")).toBeOnTheScreen();
  expect(screen.getByText("PRIVATE RELAY")).toBeOnTheScreen();
  expect(screen.getByText(/PASS THE\s*PHONE\./)).toBeOnTheScreen();

  // The reveal is the single action that advances a protected handoff. Queried by
  // role and accessible name, because that is how a screen reader reaches it.
  const reveal = screen.getByRole("button", { name: "I HAVE THE PHONE — REVEAL MY TURN" });
  expect(reveal).toBeOnTheScreen();

  await userEvent.press(reveal);
  expect(onReady).toHaveBeenCalledTimes(1);
});

// Holder privacy is a load-bearing invariant: the shutter exists so the next
// player cannot see the previous turn. The reducer is tested for this; that the
// SCREEN shows nothing was never asserted until now.
test("private shutter: no card, quote, verdict or score reaches the next player", () => {
  render(<PrivateShutterScreen onReady={jest.fn()} discardedPriorTurn />);

  for (const leak of [
    /AUTHENTIC/i,
    /FABRICATED/i,
    /SIMULATED/i,
    /ROOM ·/,
    /STREAK/i,
    /NAILED IT/i,
    /FOOLED YA/i,
  ]) {
    expect(screen.queryByText(leak)).not.toBeOnTheScreen();
  }
});

// The notice is stated only when a turn was actually discarded, so the standing
// reassurance does not have to carry the news of a specific loss.
test("private shutter: the discard notice appears only when a turn was really discarded", () => {
  const quiet = render(<PrivateShutterScreen onReady={jest.fn()} />);
  expect(screen.queryByText(/last turn was interrupted/i)).not.toBeOnTheScreen();
  // The standing reassurance is present either way.
  expect(screen.getByText(/prior prompt and result are protected/i)).toBeOnTheScreen();
  quiet.unmount();

  render(<PrivateShutterScreen onReady={jest.fn()} discardedPriorTurn />);
  const notice = screen.getByText(/last turn was interrupted/i);
  expect(notice).toBeOnTheScreen();
  expect(notice).toHaveTextContent(/Nothing was scored for it/i);
});

// At a large accessibility text size this block outgrows the viewport. As a fixed
// View the button below it was pushed off-screen, leaving the protected handoff
// with no way forward — a run stuck behind a shutter that cannot be dismissed.
test("shutter: the body scrolls, and the one action that advances it does not", () => {
  render(<PrivateShutterScreen onReady={() => {}} discardedPriorTurn />);

  const scroller = screen.UNSAFE_getByType(ScrollView);
  const scrolledText = scroller
    .findAllByType(Text)
    .map((node: { props: { children: unknown } }) => node.props.children)
    .join(" ");

  // The reading matter is inside the scroller...
  expect(scrolledText).toMatch(/PASS THE/);
  expect(scrolledText).toMatch(/interrupted/i);

  // ...and the control is NOT. A player must never have to scroll to find the
  // only thing that advances a protected handoff.
  const buttonsInsideScroller = scroller.findAllByProps({
    accessibilityRole: "button",
  });
  expect(buttonsInsideScroller).toHaveLength(0);
  expect(
    screen.getByRole("button", { name: "I HAVE THE PHONE — REVEAL MY TURN" }),
  ).toBeOnTheScreen();
});
