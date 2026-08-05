import { userEvent, render, screen } from "@testing-library/react-native";

import { volt } from "../theme/tokens";
import { ReviewScreen } from "./ReviewScreen";

/**
 * The reveal, which is where this app makes its only claims about what is true.
 *
 * Two repo constraints are enforced here rather than merely described: the truth
 * state must be readable **as text** (never colour alone), and a simulated-
 * authentic fixture must never be presented as a source-verified record. Both
 * have been asserted at the label level for a while; this asserts the screen.
 *
 * Follows the render-test pattern documented in PrivateShutterScreen.test.tsx.
 * Report-status announcements live in announce.test.tsx from A1.
 */

const fabricated = {
  id: "fixture-1",
  quote: "A fabricated line.",
  person: "Test person",
  authentic: false,
  contentState: "fabricated-for-game",
  explanation: "Written for this game.",
};

const simulatedAuthentic = {
  ...fabricated,
  id: "fixture-2",
  authentic: true,
  contentState: "fixture-authentic",
  explanation: "Simulated-authentic development fixture.",
};

const base = {
  reportStatus: null,
  reportBusy: false,
  roundIndex: 0,
  totalRounds: 5,
  reducedMotion: true,
  onReport: () => {},
  onContinue: () => {},
};

test("review: a fabricated card says so in words, not only in colour", () => {
  render(<ReviewScreen {...base} card={fabricated} />);

  expect(screen.getByText("FABRICATED FOR THIS GAME")).toBeOnTheScreen();
  expect(screen.getByText(/Written for this game\./)).toBeOnTheScreen();
});

// The distinction the whole project rests on. A development fixture must never
// read as a source-verified record, and the scare quotes are the tell.
test("review: a simulated fixture is labelled a simulation, never source-verified", () => {
  render(<ReviewScreen {...base} card={simulatedAuthentic} />);

  expect(screen.getByText(/SIMULATED AUTHENTIC/)).toBeOnTheScreen();
  expect(screen.getByText(/development simulation/i)).toBeOnTheScreen();
  expect(screen.getByText(/not a source-verified production card/i)).toBeOnTheScreen();
  // It must not claim the production label.
  expect(screen.queryByText("AUTHENTIC · THEY SAID IT")).not.toBeOnTheScreen();
});

// ADR-012 permits AI-drafted decoys only where the player is told. That makes
// the disclosure a policy commitment rather than a nicety, so it is asserted on
// the screen and not only on the label function: the conditional render is the
// part that can be deleted without any label test noticing.
test("review: an AI-assisted decoy discloses its drafting on the reveal", () => {
  render(<ReviewScreen {...base} card={{ ...fabricated, decoyMethod: "ai_assisted" }} />);

  expect(screen.getByText(/drafted with AI assistance/i)).toBeOnTheScreen();
  expect(screen.getByText(/rewritten and approved by a human editor/i)).toBeOnTheScreen();
});

test("review: a human-written decoy claims no AI assistance", () => {
  render(<ReviewScreen {...base} card={{ ...fabricated, decoyMethod: "human" }} />);

  expect(screen.queryByText(/AI assistance/i)).not.toBeOnTheScreen();
});

test("review: the report policy is stated before anything is reported", () => {
  render(<ReviewScreen {...base} card={fabricated} />);

  // Data minimisation is a stated invariant; the player is told it up front.
  const policy = screen.getByText(/Reports save locally/i);
  expect(policy).toHaveTextContent(/card ID, reason, deck version, and timestamp/i);
  expect(policy).toHaveTextContent(/No player identity or free text/i);
});

test("review: each report reason is a separate labelled control", async () => {
  const onReport = jest.fn();
  render(<ReviewScreen {...base} card={fabricated} onReport={onReport} />);

  await userEvent.press(screen.getByLabelText("Report wrong attribution"));
  expect(onReport).toHaveBeenCalledWith("wrong-attribution");

  await userEvent.press(screen.getByLabelText("Report harmful content"));
  expect(onReport).toHaveBeenLastCalledWith("harmful-content");
});

// O2: the chips disable while a write is in flight, and that state must be
// perceivable rather than only present in accessibilityState.
test("review: every report control is disabled while a report is in flight", () => {
  render(<ReviewScreen {...base} card={fabricated} reportBusy />);

  for (const label of [
    "Report wrong attribution",
    "Report harmful content",
    "Report another issue",
  ]) {
    expect(screen.getByLabelText(label)).toBeDisabled();
  }
});

// A5. These are the controls a player reaches for when something is wrong with
// the content, so they are the worst ones in the app to make fiddly. Padding
// alone left them near 40pt — under the app's own token and under both
// platforms' guidance.
test("review: every report control meets the app's own touch-target token", () => {
  render(<ReviewScreen {...base} card={fabricated} />);

  for (const label of [
    "Report wrong attribution",
    "Report harmful content",
    "Report another issue",
  ]) {
    expect(screen.getByLabelText(label)).toHaveStyle({ minHeight: volt.target.minimum });
  }
});

test("review: continuing is always available, reported or not", async () => {
  const onContinue = jest.fn();
  render(<ReviewScreen {...base} card={fabricated} onContinue={onContinue} />);

  await userEvent.press(screen.getByRole("button", { name: "NEXT PROMPT" }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});
