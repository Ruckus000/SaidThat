import { Pressable, Text, View } from "react-native";

import { Mark } from "./Mark";
import { hotmic } from "../theme/tokens";
import { s } from "./styles";

/**
 * A one-of-many selection card (mode, access role). It announces as a radio.
 * For an independent on/off preference, use ToggleRow instead.
 */
export type ChoiceProps = {
  active: boolean;
  title: string;
  body: string;
  mark?: "open" | "close";
  onPress: () => void;
};

export function Choice({ active, title, body, mark, onPress }: ChoiceProps) {
  const c = hotmic.color.dark;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      android_ripple={{ color: "rgba(205,242,68,0.12)" }}
      style={({ pressed }) => [
        s.choice,
        active ? s.choiceActive : s.choiceInactive,
        pressed && s.pressed,
      ]}
    >
      <View style={s.choiceRow}>
        {mark && <Mark name={mark} size={38} color={active ? c.lime : c.textPrimary} />}
        <Text style={[s.choiceTitle, active && s.choiceTitleActive]}>{title}</Text>
      </View>
      <Text style={s.choiceBody}>{body}</Text>
    </Pressable>
  );
}
