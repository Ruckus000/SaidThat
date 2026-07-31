import { AccessibilityInfo } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { announce } from "./announce";
import { ResultScreen } from "../components/ResultScreen";
import { ReviewScreen } from "../components/ReviewScreen";
import { reportStatusMessage } from "../components/presentationLabels";

/**
 * The rule under test is not "something was announced" — it is "what was
 * announced is exactly what is on screen". A parallel set of screen-reader-only
 * strings drifts the moment either copy is edited, and an app about what is true
 * and what is not then tells two audiences different things.
 */

let spoken: jest.SpyInstance;
beforeEach(() => {
  spoken = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
});
afterEach(() => {
  spoken.mockRestore();
  jest.useRealTimers();
});

test("announce: an unavailable native module never interrupts play", () => {
  spoken.mockImplementation(() => {
    throw new Error("AccessibilityInfo unavailable");
  });
  expect(() => announce("anything")).not.toThrow();
});

test("announce: nothing is spoken for an empty state", () => {
  announce(null);
  announce(undefined);
  announce("");
  expect(spoken).not.toHaveBeenCalled();
});

// A report chip disables itself on press, so focus sits on a dead control while
// the confirmation appears elsewhere. The live region already in the JSX is
// Android-only — on iOS this was silent.
test("announce: the report confirmation spoken is the one rendered", () => {
  const card = {
    id: "fixture-1",
    quote: "A fabricated line.",
    person: "Test person",
    authentic: false,
    contentState: "fabricated-for-game",
    explanation: "A fixture.",
  };
  const props = {
    card,
    reportBusy: false,
    roundIndex: 0,
    totalRounds: 5,
    reducedMotion: true,
    onReport: () => {},
    onContinue: () => {},
  };

  const { rerender } = render(<ReviewScreen {...props} reportStatus={null} />);
  expect(spoken).not.toHaveBeenCalled();

  rerender(<ReviewScreen {...props} reportStatus="queued" />);

  const expected = reportStatusMessage("queued");
  expect(spoken).toHaveBeenCalledWith(expected);
  // The same string is what the player can see, not a parallel wording.
  expect(screen.getByText(expected as string)).toBeOnTheScreen();
});

test("announce: a failed report is spoken with the visible failure copy", () => {
  const card = {
    id: "fixture-1",
    quote: "A fabricated line.",
    person: "Test person",
    authentic: false,
    contentState: "fabricated-for-game",
    explanation: "A fixture.",
  };
  render(
    <ReviewScreen
      card={card}
      reportStatus="failed"
      reportBusy={false}
      roundIndex={0}
      totalRounds={5}
      reducedMotion
      onReport={() => {}}
      onContinue={() => {}}
    />,
  );

  const expected = reportStatusMessage("failed") as string;
  expect(spoken).toHaveBeenCalledWith(expected);
  expect(screen.getByText(expected)).toBeOnTheScreen();
});

// The verdict arrives on a timer rather than a touch, so nothing moves focus to
// it. Both halves are already rendered.
test("announce: the verdict is spoken once the beat resolves, in the words shown", () => {
  jest.useFakeTimers();
  render(
    <ResultScreen
      correct
      streak={0}
      roundIndex={0}
      totalRounds={5}
      reducedMotion
      haptics={false}
      onReview={() => {}}
      onContinue={() => {}}
    />,
  );

  const [message] = spoken.mock.calls[0] as [string];
  // Everything spoken is visible on the screen it describes.
  for (const fragment of message.split(" ").filter((word) => word.length > 3)) {
    expect(screen.getByText(new RegExp(fragment.replace(/[.!]/g, ""), "i"))).toBeOnTheScreen();
  }
});
