import { Text, View } from "react-native";

import { PRIVATE_SHUTTER_RECOVERY } from "./presentationLabels";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PrivateShutterScreenProps = {
  onReady: () => void;
};

export function PrivateShutterScreen({ onReady }: PrivateShutterScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>PRIVATE RELAY</Text>
      <Text style={s.title}>Pass the phone.</Text>
      <Text style={s.copy}>{PRIVATE_SHUTTER_RECOVERY}</Text>
      <PrimaryButton label="I have the phone — reveal my turn" onPress={onReady} />
    </View>
  );
}
