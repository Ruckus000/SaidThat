import { AccessibilityInfo } from "react-native";
import { act, userEvent, render, screen } from "@testing-library/react-native";

import { ResultScreen } from "./ResultScreen";

/**
 * The suspense beat, and the one way out of it that did not exist.
 *
 * `revealed` is seeded from `reducedMotion` at mount and otherwise only set from
 * inside the 850ms timer. Turning Reduce Motion ON during the beat ran the
 * effect's cleanup — clearing that timer — and then returned early, so nothing
 * ever set `revealed` and the player sat on "LOCKING IT IN…" forever, one round
 * into a run they could not continue.
 */

const base = {
  correct: true,
  streak: 0,
  roundIndex: 0,
  totalRounds: 5,
  haptics: false,
  onReview: () => {},
  onContinue: () => {},
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("result: the beat resolves into the verdict on its own", () => {
  render(<ResultScreen {...base} reducedMotion={false} />);
  expect(screen.getByText("LOCKING IT IN…")).toBeOnTheScreen();

  act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(screen.queryByText("LOCKING IT IN…")).not.toBeOnTheScreen();
  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();
});

test("result: reduced motion goes straight to the verdict, no beat", () => {
  render(<ResultScreen {...base} reducedMotion />);

  expect(screen.queryByText("LOCKING IT IN…")).not.toBeOnTheScreen();
  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();
});

// The deadlock. Someone reaching for Reduce Motion mid-beat is doing it BECAUSE
// the motion bothers them, which is the worst possible moment to strand them.
test("result: turning on Reduce Motion during the beat still reveals the verdict", () => {
  const { rerender } = render(<ResultScreen {...base} reducedMotion={false} />);
  expect(screen.getByText("LOCKING IT IN…")).toBeOnTheScreen();

  act(() => {
    jest.advanceTimersByTime(300);
  });
  rerender(<ResultScreen {...base} reducedMotion />);

  expect(screen.queryByText("LOCKING IT IN…")).not.toBeOnTheScreen();
  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();

  // Letting the original timer's duration elapse must not undo it either.
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();
});

// Revealing is not enough on its own: `stamp` drives the mark's opacity and the
// verdict's scale, and it is seeded at mount only. Setting `revealed` without it
// swaps the beat for a screen that is technically the verdict and visually blank.
test("result: the verdict revealed this way is actually visible, not opacity zero", () => {
  const { rerender, UNSAFE_root } = render(<ResultScreen {...base} reducedMotion={false} />);
  act(() => {
    jest.advanceTimersByTime(300);
  });
  rerender(<ResultScreen {...base} reducedMotion />);

  // The mark's wrapper animates opacity from `stamp`. Reading the committed style
  // is the only way to catch a "revealed but invisible" screen from a test.
  const opacities = UNSAFE_root
    .findAll((node: { props?: Record<string, any> }) => {
      const style = node.props?.style;
      return Boolean(style && !Array.isArray(style) && style.opacity !== undefined);
    })
    .map((node: { props: Record<string, any> }) => {
      const raw = node.props.style.opacity;
      return typeof raw === "object" && raw !== null && "_value" in raw ? raw._value : raw;
    });

  expect(opacities.length).toBeGreaterThan(0);
  for (const opacity of opacities) {
    expect(opacity).toBe(1);
  }
});

// RC-2 sweep additions. P1 covered the reveal timing; these cover what the
// revealed screen actually says and offers.

test("result: the verdict celebrates the read, never the truth of the card", () => {
  render(<ResultScreen {...base} correct reducedMotion />);

  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();
  expect(screen.getByText("THE ROOM CALLED IT")).toBeOnTheScreen();
  // The result screen rates play. It must not label the card's truth state —
  // that belongs to the review, behind a deliberate press.
  expect(screen.queryByText(/AUTHENTIC|FABRICATED|SIMULATED/)).not.toBeOnTheScreen();
});

test("result: a miss is stated without punishing the player", () => {
  render(<ResultScreen {...base} correct={false} reducedMotion />);

  expect(screen.getByText("FOOLED YA.")).toBeOnTheScreen();
  expect(screen.getByText("THE ROOM GOT PLAYED")).toBeOnTheScreen();
  // Both routes stay open on a miss — a wrong read never costs access.
  expect(screen.getByRole("button", { name: "SEE THE TRUTH" })).toBeOnTheScreen();
});

test("result: both routes onward are reachable and distinct", async () => {
  const onReview = jest.fn();
  const onContinue = jest.fn();
  render(
    <ResultScreen {...base} correct reducedMotion onReview={onReview} onContinue={onContinue} />,
  );

  await userEvent.press(screen.getByRole("button", { name: "SEE THE TRUTH" }));
  expect(onReview).toHaveBeenCalledTimes(1);
  expect(onContinue).not.toHaveBeenCalled();

  await userEvent.press(screen.getByRole("button", { name: "NEXT PROMPT" }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test("result: the last round offers finishing the run, not another prompt", () => {
  render(<ResultScreen {...base} correct reducedMotion roundIndex={4} totalRounds={5} />);

  expect(screen.getByRole("button", { name: "FINISH THE RUN" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "NEXT PROMPT" })).not.toBeOnTheScreen();
});

// L3. This screen unmounts on an interruption — backgrounding routes through
// PAUSED — so on return it re-seeded `revealed` false and made the player sit
// through the whole 850ms beat again, for a verdict already decided, with both
// actions gone for that window.
test("result: a verdict already seen is restored immediately, not replayed", () => {
  render(<ResultScreen {...base} correct reducedMotion={false} initiallyRevealed />);

  expect(screen.queryByText("LOCKING IT IN…")).not.toBeOnTheScreen();
  expect(screen.getByText("NAILED IT!")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "SEE THE TRUTH" })).toBeOnTheScreen();
});

// Restoring must not resurrect a blank verdict: `stamp` drives the mark's
// opacity and the verdict's scale, so it takes the same seed as `revealed`.
test("result: a restored verdict is visible, not opacity zero", () => {
  const { UNSAFE_root } = render(
    <ResultScreen {...base} correct reducedMotion={false} initiallyRevealed />,
  );

  const opacities = UNSAFE_root
    .findAll((node: { props?: Record<string, any> }) => {
      const style = node.props?.style;
      return Boolean(style && !Array.isArray(style) && style.opacity !== undefined);
    })
    .map((node: { props: Record<string, any> }) => {
      const raw = node.props.style.opacity;
      return typeof raw === "object" && raw !== null && "_value" in raw ? raw._value : raw;
    });

  expect(opacities.length).toBeGreaterThan(0);
  for (const opacity of opacities) expect(opacity).toBe(1);
});

// The buzz and the announcement are for a verdict ARRIVING. On a restored screen
// they fired again — a second buzz for one answer, and VoiceOver told a new
// verdict had landed. That was half the reason the replay mattered.
test("result: a restored verdict does not buzz or announce a second time", () => {
  // jest-expo already mocks this native, so the spy wraps a mock that has been
  // accumulating calls across the whole file. Clear it, or the assertion reads
  // every earlier test's announcements as this one's.
  const spoken = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  spoken.mockClear();

  render(<ResultScreen {...base} correct reducedMotion={false} initiallyRevealed haptics />);
  expect(spoken).not.toHaveBeenCalled();

  spoken.mockRestore();
});

test("result: a first reveal still announces, so this is a restore guard not a mute", () => {
  const spoken = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  spoken.mockClear();

  render(<ResultScreen {...base} correct reducedMotion initiallyRevealed={false} />);
  expect(spoken).toHaveBeenCalled();

  spoken.mockRestore();
});

test("result: the beat still runs for a round whose verdict has not been seen", () => {
  render(<ResultScreen {...base} correct reducedMotion={false} initiallyRevealed={false} />);

  expect(screen.getByText("LOCKING IT IN…")).toBeOnTheScreen();
});
