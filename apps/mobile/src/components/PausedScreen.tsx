import { Text, View } from "react-native";

import { volt } from "../theme/tokens";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PausedScreenProps = {
  onResume: () => void;
};

export function PausedScreen({ onResume }: PausedScreenProps) {
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
      <PrimaryButton label="RESUME SAFELY" onPress={onResume} />
    </View>
  );
}
