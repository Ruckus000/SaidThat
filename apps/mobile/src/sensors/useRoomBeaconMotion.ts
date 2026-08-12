import { useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";

import { MODES } from "../domain/game";
import {
  calibrateNeutral,
  createMotionGate,
  motionAnswerFromSample,
} from "./roomBeaconMotion.js";

type MotionSample = { z: number };

/**
 * How long calibration waits for the first reading before giving up.
 *
 * Generous against a working sensor — the update interval below is 100ms, so a
 * healthy device answers in one or two frames — and short enough that a dead one
 * does not hold a button hostage.
 */
export const CALIBRATION_TIMEOUT_MS = 2000;

/**
 * One accelerometer reading, or null. Never pending forever, never rejects.
 *
 * This resolved only from inside the listener callback, with no timeout, no
 * cleanup on the failure path, and no guard around the expo-sensors calls. On a
 * device with no accelerometer, a denied motion permission, or a wedged driver,
 * the listener never fires: the promise stayed pending for the life of the
 * process, the subscription leaked, and `calibrateMotion` awaited it forever —
 * so "Calibrate neutral tilt" became a dead button with no spinner, no error and
 * no second chance. The error boundary added above App cannot help here; a
 * promise that never settles never throws.
 *
 * Resolving null rather than rejecting is deliberate: the caller's `await` then
 * cannot throw, which keeps this off the async path React boundaries do not
 * catch. "No reading" is a legitimate answer on a phone without the hardware, and
 * `calibrateNeutral` already treats null as no calibration.
 */
export async function readMotionSample(
  timeoutMs: number = CALIBRATION_TIMEOUT_MS,
): Promise<MotionSample | null> {
  return new Promise((resolve) => {
    let subscription: { remove: () => void } | null = null;
    let settled = false;

    const finish = (value: MotionSample | null) => {
      // First outcome wins, and it cleans up exactly once — the timeout and a
      // late reading can otherwise both arrive.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        subscription?.remove();
      } catch {
        // A subscription that cannot be removed is not worth failing calibration
        // over; the reading itself already succeeded or timed out.
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      subscription = Accelerometer.addListener((sample) => finish(sample));
      Accelerometer.setUpdateInterval(100);
    } catch {
      // Missing native module, denied permission, unavailable hardware.
      finish(null);
    }
  });
}

export function useRoomBeaconMotion({
  enabled,
  mode,
  neutralZ,
  onAnswer,
}: {
  enabled: boolean;
  mode: string;
  neutralZ: number | null;
  onAnswer: (guessAuthentic: boolean) => void;
}) {
  const gateRef = useRef(createMotionGate());
  // Keep the latest answer callback without putting it in the subscription
  // effect deps. App recreates onAnswer whenever game state changes; listing
  // it here tore down and re-created the Accelerometer listener mid-ROUND.
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  useEffect(() => {
    gateRef.current = createMotionGate();
  }, [neutralZ]);

  useEffect(() => {
    if (!enabled || mode !== MODES.ROOM_BEACON || neutralZ == null) return undefined;
    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((sample) => {
      const result = motionAnswerFromSample(sample, gateRef.current, { neutralZ });
      gateRef.current = result.gate;
      if (result.answer != null) onAnswerRef.current(result.answer);
    });
    return () => subscription.remove();
  }, [enabled, mode, neutralZ]);
}

export { calibrateNeutral };
