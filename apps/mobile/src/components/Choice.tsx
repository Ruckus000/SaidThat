import { Pressable, Text } from "react-native";

import { s } from "./styles";

/**
 * A one-of-many selection card (mode, access role). It announces as a radio.
 * For an independent on/off preference, use ToggleRow instead — that is the
 * single toggle affordance in the app; do not add a switch variant here.
 */
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
      android_ripple={{ color: "rgba(200,255,61,0.12)" }}
      style={({ pressed }) => [s.choice, active && s.choiceActive, pressed && s.pressed]}
    >
      <Text style={s.choiceTitle}>{title}</Text>
      <Text style={s.choiceBody}>{body}</Text>
    </Pressable>
  );
}
