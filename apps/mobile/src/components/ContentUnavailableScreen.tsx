import { Text, View } from "react-native";

import { CONTENT_UNAVAILABLE_GUARD, contentUnavailableMessage } from "./presentationLabels";
import { s } from "./styles";

export type ContentUnavailableScreenProps = {
  fault: string | null;
};

export function ContentUnavailableScreen({ fault }: ContentUnavailableScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>CONTENT PAUSED</Text>
      <Text style={s.title}>{"This deck is\nnot safe to play."}</Text>
      <Text style={s.copy}>{contentUnavailableMessage(fault)}</Text>
      <Text style={s.note}>{CONTENT_UNAVAILABLE_GUARD}</Text>
    </View>
  );
}
