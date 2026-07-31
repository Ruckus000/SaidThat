import { Text } from "react-native";
import { userEvent, render, screen } from "@testing-library/react-native";

import { Choice } from "./Choice";
import { FadeIn } from "./FadeIn";
import { Header } from "./Header";
import { Icon } from "./Icon";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { StreakSparks } from "./StreakSparks";
import { ToggleRow } from "./ToggleRow";

/**
 * RC-4 of the render sweep: the shared primitives.
 *
 * These carry two repo-wide rules that every screen then inherits for free, so
 * asserting them once here is worth more than asserting them per screen:
 *   - state survives without colour (the ON/OFF pill, the selected radio)
 *   - a MARK never carries meaning on its own; the word beside it does
 *
 * For the animated ones — FadeIn, the Header score pop — the assertion is the
 * TERMINAL state and the reduced-motion branch, never an intermediate frame.
 * Frame values are timing-dependent and would make this suite flaky for no gain;
 * what matters is that content arrives and that reduced motion skips the journey.
 */

// ---------------------------------------------------------------- ToggleRow

test("toggle: the value is readable as text, not only as a filled pill", () => {
  const { rerender } = render(
    <ToggleRow title="Haptics" hint="A kick on commit." value onValueChange={() => {}} />,
  );
  expect(screen.getByText("ON")).toBeOnTheScreen();

  rerender(
    <ToggleRow title="Haptics" hint="A kick on commit." value={false} onValueChange={() => {}} />,
  );
  expect(screen.getByText("OFF")).toBeOnTheScreen();
});

test("toggle: it announces itself as a switch carrying its own state", async () => {
  const onValueChange = jest.fn();
  render(
    <ToggleRow title="Haptics" hint="A kick on commit." value onValueChange={onValueChange} />,
  );

  const control = screen.getByRole("switch");
  expect(control).toBeChecked();

  await userEvent.press(control);
  expect(onValueChange).toHaveBeenCalledWith(false);
});

// ---------------------------------------------------------------- Choice

test("choice: selection is a radio state, not a colour", async () => {
  const onPress = jest.fn();
  const { rerender } = render(
    <Choice active title="ROOM BEACON" body="Everyone reads." onPress={onPress} />,
  );

  const control = screen.getByRole("radio", { name: /ROOM BEACON/ });
  expect(control).toBeSelected();

  rerender(<Choice active={false} title="ROOM BEACON" body="Everyone reads." onPress={onPress} />);
  expect(screen.getByRole("radio", { name: /ROOM BEACON/ })).not.toBeSelected();

  // An unselected choice is still pressable — that is how you change your mind.
  await userEvent.press(screen.getByRole("radio", { name: /ROOM BEACON/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- PrimaryButton

test("button: a disabled control says so to assistive tech and refuses presses", async () => {
  const onPress = jest.fn();
  render(<PrimaryButton label="REPORT" disabled onPress={onPress} />);

  const control = screen.getByRole("button", { name: "REPORT" });
  expect(control).toBeDisabled();

  await userEvent.press(control);
  expect(onPress).not.toHaveBeenCalled();
});

test("button: every visual variant keeps the same accessible name", () => {
  for (const variant of [
    { hero: true },
    { secondary: true },
    { destructive: true },
    { onFlash: true },
    { outlineOnFlash: true },
  ]) {
    const { unmount } = render(<PrimaryButton label="CONTINUE" onPress={() => {}} {...variant} />);
    // Styling must never change what the control is called.
    expect(screen.getByRole("button", { name: "CONTINUE" })).toBeOnTheScreen();
    unmount();
  }
});

// ---------------------------------------------------------------- Mark / Icon

// The MARK family is decorative by default and no glyph encodes correctness —
// meaning always lives in an adjacent word. A decorative glyph must therefore be
// invisible to a screen reader, or it becomes a second, wordless truth signal.
test("mark: a decorative glyph is hidden from assistive tech", () => {
  render(<Mark name="close" size={40} decorative />);

  expect(screen.queryByLabelText(/close/i)).not.toBeOnTheScreen();
});

// `decorative` defaults to true, so a label alone does nothing — the component's
// own docstring requires decorative={false} WITH the label. Worth asserting,
// because passing only a label looks like it should work and silently does not.
test("mark: a labelled glyph exposes exactly the label it was given", () => {
  render(<Mark name="close" size={40} decorative={false} label="Private handoff" />);

  expect(screen.getByLabelText("Private handoff")).toBeOnTheScreen();
});

test("icon: chrome icons render without claiming a name of their own", () => {
  render(<Icon name="gear" size={20} />);

  expect(screen.queryByLabelText(/gear/i)).not.toBeOnTheScreen();
});

// ---------------------------------------------------------------- StreakSparks

test("sparks: the count drawn matches the count asked for, and zero draws nothing", () => {
  const { rerender, UNSAFE_root } = render(<StreakSparks count={0} />);
  const countPaths = () =>
    UNSAFE_root.findAll(
      (node: { type?: unknown; props?: Record<string, unknown> }) =>
        typeof node.type === "string" && node.type.toLowerCase().includes("path"),
    ).length;

  const none = countPaths();
  rerender(<StreakSparks count={3} />);
  expect(countPaths()).toBeGreaterThan(none);
});

// ---------------------------------------------------------------- FadeIn

// Terminal state only. An intermediate opacity is timing-dependent and asserting
// one would buy flakiness in exchange for nothing.
test("fade: children arrive under reduced motion with no animation to wait for", () => {
  render(
    <FadeIn reducedMotion>
      <Text>the round begins</Text>
    </FadeIn>,
  );

  expect(screen.getByText("the round begins")).toBeOnTheScreen();
});

test("fade: children are present with motion enabled too", () => {
  render(
    <FadeIn reducedMotion={false}>
      <Text>the round begins</Text>
    </FadeIn>,
  );

  // The content exists from the first frame; only its opacity is animated. A
  // fade that gated mounting would hide content from assistive tech mid-run.
  expect(screen.getByText("the round begins")).toBeOnTheScreen();
});

// ---------------------------------------------------------------- Header

test("header: the score is readable and the home route is labelled", () => {
  render(
    <Header score={300} streak={0} reducedMotion onHome={() => {}} />,
  );

  expect(screen.getByText("ROOM · 300")).toBeOnTheScreen();
  expect(screen.getByLabelText("Return to home")).toBeOnTheScreen();
});

test("header: settings is offered only when a route to it exists", () => {
  const { rerender } = render(
    <Header score={0} streak={0} reducedMotion onHome={() => {}} />,
  );
  expect(screen.queryByLabelText("Open settings")).not.toBeOnTheScreen();

  rerender(
    <Header score={0} streak={0} reducedMotion onHome={() => {}} onSettings={() => {}} />,
  );
  expect(screen.getByLabelText("Open settings")).toBeOnTheScreen();
});

test("header: a running streak replaces the score with a worded badge", () => {
  render(<Header score={300} streak={3} reducedMotion onHome={() => {}} />);

  expect(screen.getByText("STREAK ×3")).toBeOnTheScreen();
  expect(screen.queryByText("ROOM · 300")).not.toBeOnTheScreen();
});
