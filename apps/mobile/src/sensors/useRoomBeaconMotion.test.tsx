import { render, renderHook, waitFor } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { useRoomBeaconMotion } from "./useRoomBeaconMotion";

/**
 * Proves the Accelerometer subscription is stable across onAnswer identity
 * changes. Listing onAnswer in the effect deps used to tear down and recreate
 * the listener on every ANSWER mid-ROUND.
 */

const mockAddListener = jest.fn();
const mockSetUpdateInterval = jest.fn();
jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
    setUpdateInterval: (...args: unknown[]) => mockSetUpdateInterval(...args),
  },
}));

function Harness({
  enabled,
  onAnswer,
}: {
  enabled: boolean;
  onAnswer: (guessAuthentic: boolean) => void;
}) {
  useRoomBeaconMotion({
    enabled,
    mode: MODES.ROOM_BEACON,
    neutralZ: 0,
    onAnswer,
  });
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});

test("sensor: a live subscribe throw disables tilt instead of crashing the tree", async () => {
  mockAddListener.mockImplementation(() => {
    throw new Error("Native module Accelerometer is null");
  });
  const onUnavailable = jest.fn();
  const onAnswer = jest.fn();

  renderHook(() =>
    useRoomBeaconMotion({
      enabled: true,
      mode: MODES.ROOM_BEACON,
      neutralZ: 0.1,
      onAnswer,
      onUnavailable,
    }),
  );

  await waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1));
  expect(onAnswer).not.toHaveBeenCalled();
});

test("sensor: changing onAnswer identity does not resubscribe", () => {
  const first = jest.fn();
  const second = jest.fn();
  const { rerender } = render(<Harness enabled onAnswer={first} />);
  expect(mockAddListener).toHaveBeenCalledTimes(1);

  rerender(<Harness enabled onAnswer={second} />);
  expect(mockAddListener).toHaveBeenCalledTimes(1);
});

test("sensor: the latest onAnswer is used without resubscribing", () => {
  // Capture the live listener so we can fire a sample after swapping handlers.
  const listener: { current: ((s: { z: number }) => void) | null } = { current: null };
  mockAddListener.mockImplementation((cb: (s: { z: number }) => void) => {
    listener.current = cb;
    return { remove: jest.fn() };
  });

  const first = jest.fn();
  const second = jest.fn();
  const { rerender } = render(<Harness enabled onAnswer={first} />);
  rerender(<Harness enabled onAnswer={second} />);
  expect(mockAddListener).toHaveBeenCalledTimes(1);

  // Strong +z past the commit threshold with neutralZ=0 yields authentic=true.
  listener.current?.({ z: 0.9 });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledWith(true);
});

test("sensor: toggling enabled tears down and resubscribes", () => {
  const onAnswer = jest.fn();
  const remove = jest.fn();
  mockAddListener.mockReturnValue({ remove });

  const { rerender } = render(<Harness enabled onAnswer={onAnswer} />);
  expect(mockAddListener).toHaveBeenCalledTimes(1);

  rerender(<Harness enabled={false} onAnswer={onAnswer} />);
  expect(remove).toHaveBeenCalledTimes(1);

  rerender(<Harness enabled onAnswer={onAnswer} />);
  expect(mockAddListener).toHaveBeenCalledTimes(2);
});
