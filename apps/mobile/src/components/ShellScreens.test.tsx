import { userEvent, render, screen } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { HomeScreen } from "./HomeScreen";
import { RecapScreen } from "./RecapScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SetupScreen } from "./SetupScreen";

/**
 * RC-3 of the render sweep: the shell a run is wrapped in — Home, Setup, Recap,
 * Settings. One file because these four share no state and each needs only a
 * handful of assertions; four files would be four copies of the same imports.
 *
 * Follows the render-test pattern documented in PrivateShutterScreen.test.tsx.
 */

// ---------------------------------------------------------------- Home

const home = {
  onStart: () => {},
  localFixtures: true,
  reducedMotion: true,
  roundsPlayed: 0,
  correctCount: 0,
  bestStreak: 0,
  runComplete: false,
};

test("home: the fixture disclosure is present whenever local fixtures are on", () => {
  render(<HomeScreen {...home} />);

  // Non-negotiable: a fixture build must say so on the first screen.
  expect(screen.getByText(/LOCAL DEVELOPMENT FIXTURES/)).toBeOnTheScreen();
  expect(screen.getByText(/NOT EDITORIAL CONTENT/)).toBeOnTheScreen();
});

test("home: a build without local fixtures shows no disclosure", () => {
  render(<HomeScreen {...home} localFixtures={false} />);

  expect(screen.queryByText(/LOCAL DEVELOPMENT FIXTURES/)).not.toBeOnTheScreen();
});

test("home: the standing promise about where data goes is on screen", () => {
  render(<HomeScreen {...home} />);

  expect(screen.getByText(/No accounts · no feed · everything stays on this phone/)).toBeOnTheScreen();
});

test("home: a run in progress is summarised, a fresh install is not", () => {
  const { rerender } = render(<HomeScreen {...home} />);
  expect(screen.queryByText(/THIS RUN|LAST RUN/)).not.toBeOnTheScreen();

  rerender(<HomeScreen {...home} roundsPlayed={3} correctCount={2} bestStreak={2} />);
  expect(screen.getByText(/THIS RUN/)).toHaveTextContent(/3 READS/);
});

test("home: the reset notice appears only when a reset left something behind", () => {
  const { rerender } = render(<HomeScreen {...home} />);
  expect(screen.queryByText(/could not be cleared/i)).not.toBeOnTheScreen();

  rerender(<HomeScreen {...home} notice="Reports could not be cleared." />);
  expect(screen.getByText("Reports could not be cleared.")).toBeOnTheScreen();
});

// ---------------------------------------------------------------- Setup

const setup = {
  mode: MODES.ROOM_BEACON,
  accessRole: "holder",
  motionOptIn: false,
  onMode: () => {},
  onRole: () => {},
  onMotionOptIn: () => {},
  onStart: () => {},
};

test("setup: both modes are offered as selectable controls", () => {
  render(<SetupScreen {...setup} />);

  expect(screen.getByText(/ROOM BEACON/)).toBeOnTheScreen();
  expect(screen.getByText(/PRIVATE RELAY/)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /LET'S PLAY/ })).toBeOnTheScreen();
});

// The holder/screen-facing split only exists in Room Beacon — Private Relay is
// one person at a time, so offering a role there would be meaningless.
test("setup: access roles are offered in Room Beacon and withheld in Private Relay", () => {
  const { rerender } = render(<SetupScreen {...setup} />);
  expect(screen.getByRole("radio", { name: /I'M HOLDING/ })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: /SCREEN-FACING/ })).toBeOnTheScreen();

  rerender(<SetupScreen {...setup} mode={MODES.PRIVATE_RELAY} />);
  expect(screen.queryByRole("radio", { name: /I'M HOLDING/ })).not.toBeOnTheScreen();
  // And in its place, the promise that makes a solo relay safe.
  expect(
    screen.getByText(/An interrupted turn is discarded, never revealed\./),
  ).toBeOnTheScreen();
});

// Tilt is offered only where it means anything, and never as a requirement.
test("setup: the tilt option appears only in Room Beacon", () => {
  const { rerender } = render(<SetupScreen {...setup} />);
  expect(screen.getByText("Tilt to answer")).toHaveTextContent(/Tilt to answer/);
  expect(screen.getByText(/Tapping always works\./)).toBeOnTheScreen();

  rerender(<SetupScreen {...setup} mode={MODES.PRIVATE_RELAY} />);
  expect(screen.queryByText("Tilt to answer")).not.toBeOnTheScreen();
});

// Tilt must never be required. It is opt-in, and starting is reachable without it.
test("setup: a run starts with tilt never opted into", async () => {
  const onStart = jest.fn();
  render(<SetupScreen {...setup} motionOptIn={false} onStart={onStart} />);

  await userEvent.press(screen.getByRole("button", { name: /LET'S PLAY/ }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- Recap

const recap = {
  score: 300,
  correctCount: 2,
  roundsPlayed: 3,
  bestStreak: 2,
  reducedMotion: true,
  onPlayAgain: () => {},
  onHome: () => {},
};

test("recap: the run is reported as stats, with no card left on screen", () => {
  render(<RecapScreen {...recap} />);

  expect(screen.getByText("300")).toBeOnTheScreen();
  expect(screen.getByText("2 of 3")).toBeOnTheScreen();
  // The recap holds no card — which is why Private Relay needs no shutter here.
  expect(screen.queryByText(/AUTHENTIC|FABRICATED|SIMULATED/)).not.toBeOnTheScreen();
});

test("recap: the rank rates the reading, never the player or the truth", () => {
  render(<RecapScreen {...recap} correctCount={3} roundsPlayed={3} />);

  // 100% -> ROOM ORACLE. A rank is about skill at the game, nothing else.
  expect(screen.getByText("ROOM ORACLE")).toBeOnTheScreen();
});

test("recap: a rough run is still encouraging", () => {
  render(<RecapScreen {...recap} correctCount={0} roundsPlayed={3} />);

  expect(screen.getByText("WARMING UP")).toBeOnTheScreen();
});

test("recap: both routes onward are reachable and distinct", async () => {
  const onPlayAgain = jest.fn();
  const onHome = jest.fn();
  render(<RecapScreen {...recap} onPlayAgain={onPlayAgain} onHome={onHome} />);

  await userEvent.press(screen.getByRole("button", { name: "RUN IT BACK" }));
  expect(onPlayAgain).toHaveBeenCalledTimes(1);
  expect(onHome).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- Settings

const settings = {
  reducedMotion: false,
  noMotion: false,
  hapticsEnabled: true,
  onReducedMotion: () => {},
  onNoMotion: () => {},
  onHaptics: () => {},
  onReset: () => {},
  onClose: () => {},
};

test("settings: every preference states its value as text, not colour alone", () => {
  render(<SettingsScreen {...settings} />);

  // Three toggles, each with a readable ON/OFF rather than only a filled pill.
  const states = screen.getAllByText(/^(ON|OFF)$/);
  expect(states.length).toBeGreaterThanOrEqual(3);
});

// A3's territory, asserted here because the copy is what a player acts on: a
// toggle held on by the device must say why rather than looking broken.
test("settings: a device-held reduced-motion toggle explains itself", () => {
  const { rerender } = render(<SettingsScreen {...settings} />);
  expect(screen.getByText(/Skip the suspense beat/)).toBeOnTheScreen();

  rerender(<SettingsScreen {...settings} reducedMotion motionLockedByDevice />);
  expect(screen.getByText(/On because Reduce Motion is enabled in your device settings\./)).toBeOnTheScreen();
});

test("settings: the destructive reset is reachable and labelled as destructive", async () => {
  const onReset = jest.fn();
  render(<SettingsScreen {...settings} onReset={onReset} />);

  await userEvent.press(screen.getByRole("button", { name: "RESET LOCAL SESSION" }));
  expect(onReset).toHaveBeenCalledTimes(1);
});

test("settings: the local-only promise is repeated where preferences are changed", () => {
  render(<SettingsScreen {...settings} />);

  expect(screen.getByText(/Stays on this device/i)).toHaveTextContent(
    /Tap-only play is always complete/i,
  );
});
