import { render, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { MODES } from "../domain/game";
import { RoundScreen } from "./RoundScreen";
import { s } from "./styles";

/**
 * The round at large text sizes.
 *
 * These are STRUCTURAL assertions on purpose. jest has no text measurement —
 * onLayout never fires with real geometry — so whether a block actually overflows
 * is unobservable here at any font scale (see native-verification-checklist.md).
 * What is observable is the layout contract that made overflow unrecoverable, and
 * that is what broke: the prompt card was `flex: 1`, which shrinks below its own
 * content, so growing text elsewhere squeezed the quote out of existence.
 *
 * Found on a simulator at accessibility text sizes, not by these tests. Their job
 * is to keep the fix from being undone silently.
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

test("round: the prompt card grows into spare space but never shrinks below its content", () => {
  // `flex: 1` is flexGrow 1 + flexShrink 1 + a zero basis. The shrink half is the
  // bug: the instruction, answers and pause all grow with the text scale, and they
  // took their height out of the card until the quote was no longer on screen.
  expect(s.promptCard.flexGrow).toBe(1);
  expect(s.promptCard.flexShrink).toBe(0);
  // No assertion that `flex` is absent: tsc rejects reading it off this style at
  // all, so reintroducing `flex: 1` fails these two assertions rather than
  // sneaking past a third.
});

test("round: the context pills compress instead of running off the right edge", () => {
  // Two pills on one row, both scaling with the text size. Without shrink the row
  // overran the screen and the score was clipped away.
  expect(s.roundPill.flexShrink).toBe(1);
});

test("header: the wordmark and score pill compress rather than clipping the score", () => {
  // The same overflow, on every screen that shows the shared header rather than
  // the round's own context row: the wordmark grew with the text scale and pushed
  // the pill past the right edge.
  expect(s.brand.flexShrink).toBe(1);
  expect(s.scoreWrap.flexShrink).toBe(1);
  expect(s.scorePill.flexShrink).toBe(1);
});

test("round: the prompt scrolls, and the answer controls stay outside that scroll", () => {
  render(<RoundScreen {...base} />);

  const scroll = screen.UNSAFE_getByType(ScrollView);

  // The quote is inside — it is the part allowed to run long.
  expect(within(scroll).getByText(/A fabricated line/)).toBeOnTheScreen();

  // The two commits are not. Same rule PrivateShutterScreen follows for its reveal
  // control: the thing a player must be able to press is never the thing that
  // scrolls away.
  expect(within(scroll).queryByRole("button", { name: /SAID IT/ })).toBeNull();
  expect(within(scroll).queryByRole("button", { name: /TOTAL LIE/ })).toBeNull();
  expect(screen.getByRole("button", { name: /SAID IT/ })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /TOTAL LIE/ })).toBeOnTheScreen();
});

test("round: exactly one vertical scroller, so a collapsed viewport cannot hide the quote", () => {
  render(<RoundScreen {...base} />);

  // The card used to hold a second ScrollView. Nested vertical scrollers are what
  // let the failure look like "the quote is missing" rather than "the card is too
  // short": the inner viewport collapsed to nothing with no way to drag it.
  expect(screen.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
});

test("round: the holder's prompt stays withheld from assistive tech after the change", () => {
  // The hiding props moved from the inner ScrollView onto the View that replaced
  // it. RNTL's default queries exclude hidden elements exactly as assistive tech
  // does, so these failing to find the text IS the assertion.
  render(<RoundScreen {...base} hideCardFromAssistiveTech />);

  expect(screen.queryByText(/A fabricated line/)).not.toBeOnTheScreen();
  expect(screen.getByText(/A fabricated line/, { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /SAID IT/ })).toBeOnTheScreen();
});
