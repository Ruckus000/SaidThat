import { Pressable, ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type RoundCard = {
  quote: string;
  person: string;
};

export type RoundScreenProps = {
  card: RoundCard;
  mode: string;
  round: number;
  hideCardFromAssistiveTech: boolean;
  onAnswer: (guessAuthentic: boolean) => void;
  onPause: () => void;
};

export function RoundScreen({ card, mode, round, hideCardFromAssistiveTech, onAnswer, onPause }: RoundScreenProps) {
  const roomBeacon = mode === MODES.ROOM_BEACON;
  return (
    <View style={s.round}>
      <Text style={s.mode}>{roomBeacon ? "ROOM BEACON" : "PRIVATE RELAY"} · ROUND {round}</Text>
      <View style={s.beacon}><Text style={s.game}>THIS IS A GAME PROMPT · THE REVEAL DECIDES TRUTH</Text></View>
      <ScrollView
        contentContainerStyle={s.card}
        accessibilityElementsHidden={hideCardFromAssistiveTech}
        importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
      >
        <Text style={s.quote}>“{card.quote}”</Text>
        <Text style={s.person}>— {card.person}</Text>
      </ScrollView>
      <Text style={s.instruction}>{roomBeacon ? "The group decides. The holder taps exactly one answer." : "Read privately, then make exactly one answer."}</Text>
      <View style={s.actions}>
        <PrimaryButton label="They did" onPress={() => onAnswer(true)} />
        <PrimaryButton label="Made for game" secondary onPress={() => onAnswer(false)} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pause session" onPress={onPause}><Text style={s.link}>Pause and leave safely</Text></Pressable>
    </View>
  );
}
