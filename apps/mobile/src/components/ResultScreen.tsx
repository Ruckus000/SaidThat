import { Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ResultScreenProps = {
  correct: boolean;
  onReview: () => void;
  onContinue: () => void;
};

export function ResultScreen({ correct, onReview, onContinue }: ResultScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>{correct ? "CORRECT" : "NOT THIS TIME"}</Text>
      <Text style={s.title}>{correct ? "+100 to the room" : "The truth is next."}</Text>
      <PrimaryButton label="See the truth" onPress={onReview} />
      <PrimaryButton label="Continue without review" secondary onPress={onContinue} />
    </View>
  );
}
