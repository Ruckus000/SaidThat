import { act, render, screen } from "@testing-library/react-native";

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
