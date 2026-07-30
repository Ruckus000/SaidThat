import { ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { ToggleRow } from "./ToggleRow";
import { s } from "./styles";

export type SettingsScreenProps = {
  reducedMotion: boolean;
  noMotion: boolean;
  hapticsEnabled: boolean;
  onReducedMotion: (enabled: boolean) => void;
  onNoMotion: (enabled: boolean) => void;
  onHaptics: (enabled: boolean) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SettingsScreen({
  reducedMotion,
  noMotion,
  hapticsEnabled,
  onReducedMotion,
  onNoMotion,
  onHaptics,
  onReset,
  onClose,
}: SettingsScreenProps) {
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>LOCAL SESSION</Text>
      <Text style={s.title}>SETTINGS</Text>
      <Text style={s.copy}>Stays on this device. Tap-only play is always complete.</Text>
      <View style={s.group}>
        <ToggleRow
          title="Reduced motion"
          hint="Skip the suspense beat and flashes settle instantly."
          value={reducedMotion}
          onValueChange={onReducedMotion}
        />
        <ToggleRow
          title="No motion / tap-only"
          hint="Disable optional tilt answers. Tapping stays the primary path."
          value={noMotion}
          onValueChange={onNoMotion}
        />
        <ToggleRow
          title="Haptic feedback"
          hint="A kick when the room commits and the reveal lands."
          value={hapticsEnabled}
          onValueChange={onHaptics}
        />
      </View>
      <View style={{ flex: 1, minHeight: 24 }} />
      <PrimaryButton label="RESET LOCAL SESSION" destructive onPress={onReset} />
      <PrimaryButton label="DONE" onPress={onClose} />
    </ScrollView>
  );
}
