import { render, screen } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { RoundScreen } from "./RoundScreen";

/**
 * The calibration row, which is where a dead sensor actually reaches the player.
 *
 * Bounding readMotionSample stops the hang, but on its own it turns an infinite
 * wait into a button that silently does nothing — which looks identical from the
 * sofa. These assert the row says which of the three states it is in.
 *
 * Follows the render-test pattern seeded in PrivateShutterScreen.test.tsx.
 */

const base = {
  mode: MODES.ROOM_BEACON,
  card: { id: "fixture-1", quote: "A fabricated line.", person: "Test person" },
  round: 1,
  totalRounds: 5,
  score: 0,
  streak: 0,
  hideCardFromAssistiveTech: false,
  motionOptIn: true,
  motionCalibrated: false,
  reducedMotion: true,
  haptics: false,
  onAnswer: () => {},
  onCalibrate: () => {},
  onPause: () => {},
};

test("calibration: the idle row invites a calibration and offers the control", () => {
  render(<RoundScreen {...base} />);

  expect(screen.getByText(/Hold the phone level, then calibrate/i)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Calibrate neutral tilt" })).toBeEnabled();
});

test("calibration: a read in flight disables the control instead of queueing presses", () => {
  render(<RoundScreen {...base} calibrationReading />);

  expect(screen.getByText(/Hold the phone level…/)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Calibrate neutral tilt" })).toBeDisabled();
});

// The symptom this whole item exists for: before the bound read, a device with no
// accelerometer left this button live and inert forever, with no explanation.
test("calibration: a device that reports no motion says so, and stays retryable", () => {
  render(<RoundScreen {...base} calibrationUnavailable />);

  const note = screen.getByText(/did not report motion/i);
  expect(note).toBeOnTheScreen();
  // Tap-only equivalence is load-bearing: this must read as "tilt is off", never
  // as "the game is broken".
  expect(note).toHaveTextContent(/Tapping plays the full game/i);

  // Retryable, because the cause is often transient (a permission just granted).
  expect(screen.getByRole("button", { name: "Try calibrating again" })).toBeEnabled();
});

test("calibration: once calibrated the row confirms tilt without demoting tap", () => {
  render(<RoundScreen {...base} motionCalibrated />);

  expect(screen.getByText(/Tilt is active for the holder/i)).toHaveTextContent(
    /Tap answers still commit exactly once/i,
  );
  expect(screen.queryByRole("button", { name: /[Cc]alibrat/ })).not.toBeOnTheScreen();
});

test("calibration: the row is absent entirely when tilt was never opted into", () => {
  render(<RoundScreen {...base} motionOptIn={false} calibrationUnavailable />);

  expect(screen.queryByText(/did not report motion/i)).not.toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: /[Cc]alibrat/ })).not.toBeOnTheScreen();
});
