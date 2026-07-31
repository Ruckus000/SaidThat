import { useEffect } from "react";
import { Text } from "react-native";
import { userEvent, render, screen } from "@testing-library/react-native";

import { ErrorBoundary } from "./ErrorBoundary";

// React logs the caught error to console.error regardless of the boundary. That
// noise is expected here, and silencing it is not hiding a failure — the
// assertions below are what prove the boundary worked.
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

function Boom({ throws }: { throws: boolean }): React.ReactElement {
  if (throws) throw new Error("native module unavailable");
  return <Text>the room is playing</Text>;
}

test("boundary: a child that throws is replaced by a recoverable screen", () => {
  render(
    <ErrorBoundary>
      <Boom throws />
    </ErrorBoundary>,
  );

  // The broken subtree is gone...
  expect(screen.queryByText("the room is playing")).not.toBeOnTheScreen();
  // ...and something the player can act on is in its place.
  expect(screen.getByText(/The room\s*stopped short\./)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "START OVER" })).toBeOnTheScreen();
});

// The fallback is read by a room, not a developer. It must not leak the error, and
// it must not imply anything left the device — this app never sends anything.
test("boundary: the fallback shows no error text and claims no data left the device", () => {
  render(
    <ErrorBoundary>
      <Boom throws />
    </ErrorBoundary>,
  );

  expect(screen.queryByText(/native module unavailable/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/Error:/)).not.toBeOnTheScreen();
  expect(screen.getByText(/Nothing was sent anywhere/i)).toBeOnTheScreen();
});

// The claim under test is "recovery genuinely rebuilds the subtree", not merely
// "the fallback goes away". A child that mounts, then throws, then recovers proves
// it: its mount effect must run a second time.
test("boundary: recovery is a real remount, not just a re-render", async () => {
  let unavailable = false;
  const mounts: string[] = [];
  function Counted() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      mounts.push("mount");
    }, []);
    if (unavailable) throw new Error("native module unavailable");
    return <Text>the room is playing</Text>;
  }

  const { rerender } = render(
    <ErrorBoundary>
      <Counted />
    </ErrorBoundary>,
  );
  expect(mounts).toHaveLength(1);

  unavailable = true;
  rerender(
    <ErrorBoundary>
      <Counted />
    </ErrorBoundary>,
  );
  expect(screen.getByRole("button", { name: "START OVER" })).toBeOnTheScreen();

  unavailable = false;
  await userEvent.press(screen.getByRole("button", { name: "START OVER" }));

  expect(await screen.findByText("the room is playing")).toBeOnTheScreen();
  expect(mounts).toHaveLength(2);
});

test("boundary: recovering shows the healthy tree instead of re-throwing in a loop", async () => {
  // The failure is driven from outside the component rather than by a flag the
  // component flips itself: React may invoke a component more than once per
  // commit, so a self-clearing flag makes the test depend on invocation count
  // instead of on the boundary's behaviour. This models the real case either way
  // — a native module unavailable at mount that is fine on a fresh subscription.
  let unavailable = true;
  function Flaky() {
    if (unavailable) throw new Error("native module unavailable");
    return <Text>the room is playing</Text>;
  }

  render(
    <ErrorBoundary>
      <Flaky />
    </ErrorBoundary>,
  );
  expect(screen.getByRole("button", { name: "START OVER" })).toBeOnTheScreen();

  unavailable = false;

  await userEvent.press(screen.getByRole("button", { name: "START OVER" }));

  expect(await screen.findByText("the room is playing")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "START OVER" })).not.toBeOnTheScreen();
});

test("boundary: a healthy tree is passed through untouched", () => {
  render(
    <ErrorBoundary>
      <Boom throws={false} />
    </ErrorBoundary>,
  );

  expect(screen.getByText("the room is playing")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "START OVER" })).not.toBeOnTheScreen();
});
