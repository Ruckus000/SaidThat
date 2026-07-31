import { CALIBRATION_TIMEOUT_MS, readMotionSample } from "./useRoomBeaconMotion";

/**
 * `readMotionSample` is the one async seam the error boundary cannot protect: a
 * promise that never settles never throws, so nothing above it ever learns. These
 * tests are the guarantee that it always settles.
 *
 * Lives in a .tsx file so it runs under jest — expo-sensors cannot be imported by
 * the `node --test` layer. The name still says what it covers.
 */

// jest.mock is hoisted above these declarations, so the factory may only close
// over names prefixed `mock` — that prefix is the rule, not a style choice.
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
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("sensor: a reading resolves and the subscription is removed exactly once", async () => {
  const remove = jest.fn();
  mockAddListener.mockImplementation((cb: (s: { z: number }) => void) => {
    setTimeout(() => cb({ z: 0.42 }), 10);
    return { remove };
  });

  const pending = readMotionSample();
  jest.advanceTimersByTime(10);

  expect(await pending).toEqual({ z: 0.42 });
  expect(remove).toHaveBeenCalledTimes(1);
});

// The bug: this promise resolved only from inside the listener. A device with no
// accelerometer, a denied permission, or a wedged driver never fires it, so the
// await never returned and "Calibrate neutral tilt" became a dead button.
test("sensor: a listener that never fires resolves null instead of hanging forever", async () => {
  const remove = jest.fn();
  mockAddListener.mockReturnValue({ remove });

  const pending = readMotionSample();
  jest.advanceTimersByTime(CALIBRATION_TIMEOUT_MS);

  expect(await pending).toBeNull();
  // And the subscription is not leaked on the way out.
  expect(remove).toHaveBeenCalledTimes(1);
});

test("sensor: a throwing native module resolves null rather than rejecting", async () => {
  mockAddListener.mockImplementation(() => {
    throw new Error("Native module Accelerometer is null");
  });

  // Rejecting here would put the failure on the one path React boundaries cannot
  // catch, which is the whole reason this resolves instead.
  await expect(readMotionSample()).resolves.toBeNull();
});

test("sensor: a reading arriving after the timeout does not resolve twice", async () => {
  const remove = jest.fn();
  // Held in a mutable box rather than a `let`: TypeScript's control-flow analysis
  // cannot see the mock invoking the assignment, so a plain `let` narrows to
  // `never` at the call below and fails typecheck while passing at runtime.
  const late: { cb: ((s: { z: number }) => void) | null } = { cb: null };
  mockAddListener.mockImplementation((cb: (s: { z: number }) => void) => {
    late.cb = cb;
    return { remove };
  });

  const pending = readMotionSample();
  jest.advanceTimersByTime(CALIBRATION_TIMEOUT_MS);
  expect(await pending).toBeNull();

  // The straggler must be inert: no second resolve, no second remove.
  late.cb?.({ z: 0.9 });
  expect(remove).toHaveBeenCalledTimes(1);
});
