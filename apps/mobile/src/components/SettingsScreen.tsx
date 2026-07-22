import { ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { ToggleRow } from "./ToggleRow";
import { s } from "./styles";

export type SettingsScreenProps = {
  reducedMotion: boolean;
  noMotion: boolean;
  onReducedMotion: (enabled: boolean) => void;
  onNoMotion: (enabled: boolean) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SettingsScreen({
  reducedMotion,
  noMotion,
  onReducedMotion,
  onNoMotion,
  onReset,
  onClose,
}: SettingsScreenProps) {
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>LOCAL SESSION</Text>
      <Text style={s.title}>Session settings</Text>
      <Text style={s.copy}>These preferences stay on this device only. Tap-only play remains complete.</Text>
      <Text style={s.sectionLabel}>ACCESS PREFERENCES</Text>
      <View style={s.group}>
        <ToggleRow
          title="Reduced motion"
          hint="Minimize transition motion when the app animates."
          value={reducedMotion}
          onValueChange={onReducedMotion}
        />
        <ToggleRow
          title="No motion / tap-only"
          hint="Disable optional tilt answers. Tapping stays the primary path."
          value={noMotion}
          onValueChange={onNoMotion}
        />
      </View>
      <Text style={s.sectionLabel}>RESET</Text>
      <Text style={s.note}>Clears the current room session and locally queued reports after confirmation.</Text>
      <PrimaryButton label="Reset local session and reports" secondary onPress={onReset} />
      <PrimaryButton label="Close settings" onPress={onClose} />
    </ScrollView>
  );
}
