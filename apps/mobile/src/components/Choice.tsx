import { Pressable, Text } from "react-native";
import type { AccessibilityRole } from "react-native";

import { s } from "./styles";

export type ChoiceProps = {
  active: boolean;
  title: string;
  body: string;
  onPress: () => void;
  /**
   * "radio" for one-of-many selections (mode, access role); "switch" for
   * independent on/off preferences (tilt, reduced motion). Defaults to radio.
   */
  role?: Extract<AccessibilityRole, "radio" | "switch">;
};

export function Choice({ active, title, body, onPress, role = "radio" }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "switch" ? { checked: active } : { selected: active }}
      onPress={onPress}
      android_ripple={{ color: "rgba(200,255,61,0.12)" }}
      style={({ pressed }) => [s.choice, active && s.choiceActive, pressed && s.pressed]}
    >
      <Text style={s.choiceTitle}>{title}</Text>
      <Text style={s.choiceBody}>{body}</Text>
    </Pressable>
  );
}
