import { Text, View } from "react-native";

import { volt } from "../theme/tokens";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PausedScreenProps = {
  onResume: () => void;
  onLeave: () => void;
};

export function PausedScreen({ onResume, onLeave }: PausedScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.center, { gap: 14 }]}>
        <Mark name="selectionDot" size={64} color={volt.color.dark.textDim} />
        <Text style={s.eyebrow}>SESSION PAUSED</Text>
        <Text style={s.displayPaused}>{"NOTHING WAS\nSUBMITTED."}</Text>
        <Text style={s.copy}>
          Resume when the same room is ready. The round and score remain intact.
        </Text>
      </View>
      {/*
        Paused is the one screen that owns leaving. Neither Round nor Paused
        carries the wordmark, so without this a run in progress has no way back
        to Home until the recap. Leaving is non-destructive: GO_HOME keeps the
        run counters, so Home still reports the abandoned run as "THIS RUN".
      */}
      <View style={s.actions}>
        <PrimaryButton label="RESUME SAFELY" onPress={onResume} />
        <PrimaryButton label="LEAVE THE ROOM" secondary onPress={onLeave} />
      </View>
    </View>
  );
}
