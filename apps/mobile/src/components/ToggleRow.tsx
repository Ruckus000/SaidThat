import { Pressable, Text, View } from "react-native";

import { toggleStateLabel } from "./presentationLabels";
import { s } from "./styles";

export type ToggleRowProps = {
  title: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

/**
 * A slim on/off row for optional preferences. Reads as a toggle (not a
 * one-of-many choice card), announces as a switch, and shows a text ON/OFF pill
 * so the state survives without color. Tap target stays at least 56dp.
 */
export function ToggleRow({ title, hint, value, onValueChange }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={() => onValueChange(!value)}
      android_ripple={{ color: "rgba(200,255,61,0.12)" }}
      style={({ pressed }) => [s.toggleRow, pressed && s.pressed]}
    >
      <View style={s.toggleText}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.toggleHint}>{hint}</Text>
      </View>
      <View style={[s.togglePill, value && s.togglePillOn]}>
        <Text style={[s.togglePillText, value && s.togglePillTextOn]}>{toggleStateLabel(value)}</Text>
      </View>
    </Pressable>
  );
}
