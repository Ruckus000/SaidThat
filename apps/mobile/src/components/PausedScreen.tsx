import { Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PausedScreenProps = {
  onResume: () => void;
};

export function PausedScreen({ onResume }: PausedScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>SESSION PAUSED</Text>
      <Text style={s.title}>Nothing was submitted.</Text>
      <Text style={s.copy}>Resume when the same room is ready. The round and score remain intact.</Text>
      <PrimaryButton label="Resume safely" onPress={onResume} />
    </View>
  );
}
