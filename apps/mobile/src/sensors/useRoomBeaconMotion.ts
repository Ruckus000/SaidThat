import { useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";

import { MODES } from "../domain/game";
import {
  calibrateNeutral,
  createMotionGate,
  motionAnswerFromSample,
} from "./roomBeaconMotion.js";

type MotionSample = { z: number };

export async function readMotionSample(): Promise<MotionSample | null> {
  return new Promise((resolve) => {
    const subscription = Accelerometer.addListener((sample) => {
      subscription.remove();
      resolve(sample);
    });
    Accelerometer.setUpdateInterval(100);
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

  useEffect(() => {
    gateRef.current = createMotionGate();
  }, [neutralZ]);

  useEffect(() => {
    if (!enabled || mode !== MODES.ROOM_BEACON || neutralZ == null) return undefined;
    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((sample) => {
      const result = motionAnswerFromSample(sample, gateRef.current, { neutralZ });
      gateRef.current = result.gate;
      if (result.answer != null) onAnswer(result.answer);
    });
    return () => subscription.remove();
  }, [enabled, mode, neutralZ, onAnswer]);
}

export { calibrateNeutral };
