import { Pressable, ScrollView, Text, View } from "react-native";

import { roundInstruction, roundModeLabel } from "./presentationLabels";
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
  return (
    <View style={s.round}>
      <Text style={s.mode}>{roundModeLabel(mode, round)}</Text>
      <View style={s.beacon}><Text style={s.game}>THIS IS A GAME PROMPT · THE REVEAL DECIDES TRUTH</Text></View>
      <ScrollView
        contentContainerStyle={s.card}
        accessibilityElementsHidden={hideCardFromAssistiveTech}
        importantForAccessibility={hideCardFromAssistiveTech ? "no-hide-descendants" : "auto"}
      >
        <Text style={s.quote}>“{card.quote}”</Text>
        <Text style={s.person}>— {card.person}</Text>
      </ScrollView>
      <Text style={s.instruction}>{roundInstruction(mode)}</Text>
      <View style={s.actions}>
        <PrimaryButton label="They did" onPress={() => onAnswer(true)} />
        <PrimaryButton label="Made for game" secondary onPress={() => onAnswer(false)} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pause session" onPress={onPause}><Text style={s.link}>Pause and leave safely</Text></Pressable>
    </View>
  );
}
