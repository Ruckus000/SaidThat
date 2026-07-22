import { Pressable, Text } from "react-native";

import { s } from "./styles";

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, secondary = false, disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      android_ripple={{ color: "rgba(0,0,0,0.18)" }}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>
    </Pressable>
  );
}
