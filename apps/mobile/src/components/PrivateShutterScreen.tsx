import { Text, View } from "react-native";

import { hotmic } from "../theme/tokens";
import { PRIVATE_SHUTTER_RECOVERY } from "./presentationLabels";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PrivateShutterScreenProps = {
  onReady: () => void;
};

export function PrivateShutterScreen({ onReady }: PrivateShutterScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      <View style={s.shutterPill}>
        <Text style={s.shutterPillText}>PRIVATE HANDOFF</Text>
      </View>
      <View style={[s.center, { gap: 14 }]}>
        <Mark name="close" size={88} color={hotmic.color.dark.lime} />
        <Text style={s.eyebrowPink}>PRIVATE RELAY</Text>
        <Text style={s.displayL}>{"PASS THE\nPHONE."}</Text>
        <Text style={s.copy}>{PRIVATE_SHUTTER_RECOVERY}</Text>
      </View>
      <PrimaryButton label="I HAVE THE PHONE — REVEAL MY TURN" onPress={onReady} />
    </View>
  );
}
