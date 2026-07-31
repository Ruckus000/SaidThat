import { ScrollView, Text } from "react-native";

import { CONTENT_UNAVAILABLE_GUARD, contentUnavailableMessage } from "./presentationLabels";
import { s } from "./styles";

export type ContentUnavailableScreenProps = {
  fault: string | null;
};

export function ContentUnavailableScreen({ fault }: ContentUnavailableScreenProps) {
  return (
    // Scrollable because this screen is the one a player reads when nothing else
    // works. It has no action to reach, but the guard line at the bottom is the
    // part that explains WHY play stopped, and at a large text size a fixed View
    // clipped exactly that — leaving a dead end with its reason cut off.
    <ScrollView contentContainerStyle={s.centerScroll}>
      <Text style={s.eyebrow}>CONTENT PAUSED</Text>
      <Text style={s.title}>{"This deck is\nnot safe to play."}</Text>
      <Text style={s.copy}>{contentUnavailableMessage(fault)}</Text>
      <Text style={s.note}>{CONTENT_UNAVAILABLE_GUARD}</Text>
    </ScrollView>
  );
}
