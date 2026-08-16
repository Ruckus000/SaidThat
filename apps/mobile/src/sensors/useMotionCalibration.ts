import { useCallback, useState } from "react";

import { calibrateNeutral, readMotionSample } from "./useRoomBeaconMotion";

/**
 * Room Beacon optional tilt calibration.
 *
 * The read is bounded and never rejects. Empty is a legitimate answer on a
 * device with no accelerometer or a denied permission — say so, rather than
 * leaving a button that silently does nothing. Tap answers stay available.
 */
export function useMotionCalibration() {
  const [motionNeutralZ, setMotionNeutralZ] = useState<number | null>(null);
  const [calibrationReading, setCalibrationReading] = useState(false);
  const [calibrationUnavailable, setCalibrationUnavailable] = useState(false);

  const clearCalibration = useCallback(() => {
    setMotionNeutralZ(null);
    setCalibrationUnavailable(false);
  }, []);

  const onUnavailable = useCallback(() => {
    setMotionNeutralZ(null);
    setCalibrationUnavailable(true);
  }, []);

  const calibrate = useCallback(async () => {
    if (calibrationReading) return;
    setCalibrationReading(true);
    setCalibrationUnavailable(false);
    const neutral = calibrateNeutral(await readMotionSample());
    setCalibrationReading(false);
    if (neutral == null) {
      setCalibrationUnavailable(true);
      return;
    }
    setMotionNeutralZ(neutral);
  }, [calibrationReading]);

  return {
    motionNeutralZ,
    calibrationReading,
    calibrationUnavailable,
    calibrate,
    onUnavailable,
    clearCalibration,
  };
}
