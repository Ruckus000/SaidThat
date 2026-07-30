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
 * The single on/off control in the app: every boolean preference uses this.
 * Shows a text ON/OFF pill so the state survives without color.
 */
export function ToggleRow({ title, hint, value, onValueChange }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={() => onValueChange(!value)}
      android_ripple={{ color: "rgba(205,242,68,0.12)" }}
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
