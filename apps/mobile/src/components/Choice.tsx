import { Pressable, Text } from "react-native";

import { s } from "./styles";

export type ChoiceProps = {
  active: boolean;
  title: string;
  body: string;
  onPress: () => void;
};

export function Choice({ active, title, body, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.choice, active && s.choiceActive]}
    >
      <Text style={s.choiceTitle}>{title}</Text>
      <Text style={s.choiceBody}>{body}</Text>
    </Pressable>
  );
}
