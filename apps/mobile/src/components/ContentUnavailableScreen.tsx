import { ScrollView, Text } from "react-native";

import { CONTENT_UNAVAILABLE_GUARD, contentUnavailableMessage } from "./presentationLabels";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ContentUnavailableScreenProps = {
  fault: string | null;
  /** Recovery action from the content-state map: return home and wait for a reviewed deck. */
  onHome?: () => void;
};

export function ContentUnavailableScreen({ fault, onHome }: ContentUnavailableScreenProps) {
  return (
    // Scrollable because this screen is the one a player reads when nothing else
    // works. The guard line at the bottom explains WHY play stopped, and at a
    // large text size a fixed View clipped exactly that — leaving a dead end
    // with its reason cut off. The home action is on-screen too so recovery is
    // reachable without hunting the header.
    <ScrollView contentContainerStyle={s.centerScroll}>
      <Text style={s.eyebrow}>CONTENT PAUSED</Text>
      <Text style={s.title}>{"This deck is\nnot safe to play."}</Text>
      <Text style={s.copy}>{contentUnavailableMessage(fault)}</Text>
      <Text style={s.note}>{CONTENT_UNAVAILABLE_GUARD}</Text>
      {onHome ? <PrimaryButton label="BACK HOME" secondary onPress={onHome} /> : null}
    </ScrollView>
  );
}
