import { Pressable, Text, View } from "react-native";

import { toggleStateLabel } from "./presentationLabels";
import { s } from "./styles";

export type ToggleRowProps = {
  title: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  /**
   * The value is held from outside the app and this control cannot lower it —
   * today, only the device's Reduce Motion setting. The hint says why; this
   * makes the control stop pretending it can be changed.
   */
  disabled?: boolean;
};

/**
 * The single on/off control in the app: every boolean preference uses this.
 * Shows a text ON/OFF pill so the state survives without color.
 *
 * `disabled` exists because the reduced-motion row can be held ON by the device.
 * The explanatory hint was added first, and on its own it left a control that
 * read "you may change this", accepted a press, and did nothing — which is worse
 * than a control that plainly cannot be changed. accessibilityState now carries
 * both facts, so a screen reader says "dimmed" rather than only "on".
 */
export function ToggleRow({ title, hint, value, onValueChange, disabled = false }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={`${title}. ${hint}`}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      android_ripple={disabled ? undefined : { color: "rgba(205,242,68,0.12)" }}
      style={({ pressed }) => [s.toggleRow, disabled && s.disabled, pressed && !disabled && s.pressed]}
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
