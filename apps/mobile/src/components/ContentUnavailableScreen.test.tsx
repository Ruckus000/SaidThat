import { render, screen } from "@testing-library/react-native";

import { ContentUnavailableScreen } from "./ContentUnavailableScreen";

/**
 * The first of the per-screen render tests, and one half of the pattern the rest
 * follow. See PrivateShutterScreen.test.tsx for the pattern's own documentation.
 *
 * This screen is a content-state recovery path: .designops/06-content-state-map.json
 * lists "empty" and "error" as applicable states whose recovery is to return home
 * and wait for a reviewed deck, "never substitute a withheld or candidate
 * public-figure record". Until now that path was asserted only at the label level
 * — the strings were tested, the screen that shows them was not.
 */

test("content-unavailable: an empty deck explains itself and states the guard", () => {
  render(<ContentUnavailableScreen fault="no-safe-playable-content" />);

  expect(screen.getByText("CONTENT PAUSED")).toBeOnTheScreen();
  expect(screen.getByText(/This deck is\s*not safe to play\./)).toBeOnTheScreen();
  expect(screen.getByText(/No reviewed, playable content is available/i)).toBeOnTheScreen();
});

test("content-unavailable: a corrupt deck names the integrity failure, not the empty case", () => {
  render(<ContentUnavailableScreen fault="corrupt-deck" />);

  expect(screen.getByText(/failed an integrity check/i)).toBeOnTheScreen();
  expect(screen.queryByText(/No reviewed, playable content is available/i)).not.toBeOnTheScreen();
});

// The standing guard is the reason this screen exists rather than the deck simply
// serving something else. It is not decoration and must survive on every fault.
test("content-unavailable: the withheld-record guard is stated whatever the fault", () => {
  for (const fault of ["no-safe-playable-content", "corrupt-deck", null]) {
    const view = render(<ContentUnavailableScreen fault={fault} />);
    expect(
      screen.getByText(/Disputed, removed, and source-unavailable records are never used/i),
    ).toBeOnTheScreen();
    view.unmount();
  }
});
