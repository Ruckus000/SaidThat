import { Text, View } from "react-native";

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
      <Text style={s.copy}>The prior prompt and result are protected. If the app was interrupted, that private turn was discarded rather than shown to the next person.</Text>
      <PrimaryButton label="I have the phone — reveal my turn" onPress={onReady} />
    </View>
  );
}
