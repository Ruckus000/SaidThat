import { Text, View } from "react-native";

import { s } from "./styles";

export type ContentUnavailableScreenProps = {
  fault: string | null;
};

export function ContentUnavailableScreen({ fault }: ContentUnavailableScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>CONTENT PAUSED</Text>
      <Text style={s.title}>This deck is not safe to play.</Text>
      <Text style={s.copy}>{fault === "corrupt-deck" ? "The deck failed an integrity check." : "No reviewed, playable content is available on this device."}</Text>
      <Text style={s.note}>Disputed, removed, and source-unavailable records are never used as binary game prompts.</Text>
    </View>
  );
}
