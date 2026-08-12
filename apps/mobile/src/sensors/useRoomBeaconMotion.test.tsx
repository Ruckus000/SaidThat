import { renderHook, waitFor } from "@testing-library/react-native";

import { MODES } from "../domain/game";
import { useRoomBeaconMotion } from "./useRoomBeaconMotion";

const mockAddListener = jest.fn();
const mockSetUpdateInterval = jest.fn();
jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
    setUpdateInterval: (...args: unknown[]) => mockSetUpdateInterval(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
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
