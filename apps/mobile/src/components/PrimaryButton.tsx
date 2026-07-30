import { Pressable, Text } from "react-native";

import { s } from "./styles";

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** The one action that opens a stage (START A ROOM / LET'S PLAY / RUN IT BACK). */
  hero?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  onFlash?: boolean;
  onFlashMiss?: boolean;
  outlineOnFlash?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  hero = false,
  secondary = false,
  destructive = false,
  onFlash = false,
  onFlashMiss = false,
  outlineOnFlash = false,
  disabled = false,
}: PrimaryButtonProps) {
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
        destructive && s.destructive,
        onFlash && s.onFlash,
        outlineOnFlash && s.outlineOnFlash,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          s.buttonText,
          hero && s.buttonTextHero,
          secondary && s.secondaryText,
          destructive && s.destructiveText,
          onFlash && s.onFlashText,
          onFlashMiss && s.onFlashMissText,
          outlineOnFlash && s.outlineOnFlashText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
