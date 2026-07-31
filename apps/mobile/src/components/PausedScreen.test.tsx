import { userEvent, render, screen } from "@testing-library/react-native";

import { PausedScreen } from "./PausedScreen";

/**
 * Paused, the deliberate off-ramp. Follows the render-test pattern documented in
 * PrivateShutterScreen.test.tsx.
 *
 * This screen is load-bearing twice over. It is the only route back to Home
 * mid-run — neither Round nor Paused carries the wordmark — and it is what makes
 * a deliberate pause different from an interruption: an interruption discards the
 * protected turn, a pause keeps it. Both facts are asserted here at the level a
 * player experiences them, because both were previously only reducer-deep.
 */

test("paused: the screen states plainly that nothing was submitted", () => {
  render(<PausedScreen onResume={() => {}} onLeave={() => {}} />);

  expect(screen.getByText(/NOTHING WAS\s*SUBMITTED\./)).toBeOnTheScreen();
  // The reassurance a player actually needs: their round survived the pause.
  expect(screen.getByText(/round and score remain intact/i)).toBeOnTheScreen();
});

// Holder privacy is a release requirement, and a paused phone is precisely a
// phone that may have changed hands. Nothing about the turn may be on screen.
test("paused: no card, quote, verdict or score is on screen", () => {
  render(<PausedScreen onResume={() => {}} onLeave={() => {}} />);

  expect(screen.queryByText(/SAID IT|TOTAL LIE/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/AUTHENTIC|FABRICATED|SIMULATED/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/ROOM · /)).not.toBeOnTheScreen();
  expect(screen.queryByText(/STREAK/)).not.toBeOnTheScreen();
});

test("paused: both routes out are reachable and distinct", async () => {
  const onResume = jest.fn();
  const onLeave = jest.fn();
  render(<PausedScreen onResume={onResume} onLeave={onLeave} />);

  await userEvent.press(screen.getByRole("button", { name: "RESUME SAFELY" }));
  expect(onResume).toHaveBeenCalledTimes(1);
  expect(onLeave).not.toHaveBeenCalled();

  await userEvent.press(screen.getByRole("button", { name: "LEAVE THE ROOM" }));
  expect(onLeave).toHaveBeenCalledTimes(1);
  // Leaving must not also resume — they are opposite intentions.
  expect(onResume).toHaveBeenCalledTimes(1);
});

// The acceptance criterion for every sweep test: an optional dependency failing
// must still leave the fixture round completable by tap. Paused takes no optional
// dependency at all, and that is the assertion — it renders and both controls
// work with no sensor, no haptics, and no storage available.
test("paused: the off-ramp works with every optional dependency absent", async () => {
  const onLeave = jest.fn();
  render(<PausedScreen onResume={() => {}} onLeave={onLeave} />);

  await userEvent.press(screen.getByRole("button", { name: "LEAVE THE ROOM" }));
  expect(onLeave).toHaveBeenCalledTimes(1);
});
