import { userEvent, render, screen } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { RoundScreen } from "./RoundScreen";

/**
 * The round, where the two load-bearing repo constraints actually meet a player:
 * tap-only is a complete first-class route, and the Room Beacon holder never
 * receives the prompt.
 *
 * Follows the render-test pattern documented in PrivateShutterScreen.test.tsx.
 * Calibration states live in RoundScreenCalibration.test.tsx from SE1; this file
 * covers the prompt, the two commits, and the privacy boundary.
 */

const base = {
  card: { quote: "A fabricated line.", person: "Test person" },
  mode: MODES.ROOM_BEACON,
  round: 2,
  totalRounds: 5,
  score: 300,
  streak: 0,
  hideCardFromAssistiveTech: false,
  motionOptIn: false,
  motionCalibrated: false,
  reducedMotion: true,
  haptics: false,
  onCalibrate: () => {},
  onAnswer: () => {},
  onPause: () => {},
};

test("round: the prompt and both answers are present without any optional dependency", () => {
  render(<RoundScreen {...base} />);

  expect(screen.getByText(/A fabricated line\./)).toBeOnTheScreen();
  expect(screen.getByText(/Test person/)).toBeOnTheScreen();
  // Tilt off, haptics off, reduced motion on — the whole round is still here.
  expect(screen.getByRole("button", { name: /SAID IT/ })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /TOTAL LIE/ })).toBeOnTheScreen();
});

// Tap-only is a complete route, not a fallback. This is the sweep's acceptance
// criterion in its strongest form: every optional dependency off, round still
// completable by tap.
test("round: a tap commits an answer with tilt, haptics and motion all absent", async () => {
  const onAnswer = jest.fn();
  render(<RoundScreen {...base} onAnswer={onAnswer} />);

  await userEvent.press(screen.getByRole("button", { name: /SAID IT/ }));
  expect(onAnswer).toHaveBeenCalledWith(true);

  await userEvent.press(screen.getByRole("button", { name: /TOTAL LIE/ }));
  expect(onAnswer).toHaveBeenLastCalledWith(false);
});

// The forehead-holder rule. In Room Beacon the holder cannot see the prompt, so
// a screen reader must not read it to them either — that would hand them the
// answer. The reducer has been tested for this; the screen had not.
test("round: the holder's prompt is withheld from assistive tech, controls are not", () => {
  render(<RoundScreen {...base} hideCardFromAssistiveTech />);

  // RNTL's queries exclude hidden elements by default, exactly as assistive tech
  // does — so a plain query failing IS the assertion, and it is a truer one than
  // reading accessibilityElementsHidden off a prop would be.
  expect(screen.queryByText(/A fabricated line/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/Test person/)).not.toBeOnTheScreen();

  // But it is still on screen for the room to read aloud — the holder points the
  // phone outward. Withheld from the screen reader, not from the room.
  expect(
    screen.getByText(/A fabricated line/, { includeHiddenElements: true }),
  ).toBeOnTheScreen();

  // And hiding the prompt must never cost the holder the ability to commit.
  expect(screen.getByRole("button", { name: /SAID IT/ })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /TOTAL LIE/ })).toBeOnTheScreen();
});

test("round: the screen-facing mode reads the prompt to assistive tech normally", () => {
  render(<RoundScreen {...base} mode={MODES.PRIVATE_RELAY} hideCardFromAssistiveTech={false} />);

  // Private Relay is read privately by one player, so nothing is withheld.
  expect(screen.getByText(/A fabricated line/)).toBeOnTheScreen();
  expect(screen.getByText(/Test person/)).toBeOnTheScreen();
});

test("round: the context row states the round and carries no truth signal", () => {
  render(<RoundScreen {...base} />);

  expect(screen.getByText("ROUND 2 / 5")).toBeOnTheScreen();
  // Nothing on the round screen may hint at the answer before a commit.
  expect(screen.queryByText(/AUTHENTIC|FABRICATED|SIMULATED/)).not.toBeOnTheScreen();
});

test("round: pause is reachable from the round itself", async () => {
  const onPause = jest.fn();
  render(<RoundScreen {...base} onPause={onPause} />);

  await userEvent.press(screen.getByText(/[Pp]ause/));
  expect(onPause).toHaveBeenCalledTimes(1);
});
