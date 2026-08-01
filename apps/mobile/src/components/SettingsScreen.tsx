import { ScrollView, Text, View } from "react-native";

import { reducedMotionHint } from "./presentationLabels";
import { PrimaryButton } from "./PrimaryButton";
import { ToggleRow } from "./ToggleRow";
import { s } from "./styles";

export type SettingsScreenProps = {
  reducedMotion: boolean;
  /** The device's Reduce Motion setting is holding it on; the toggle cannot lower it. */
  motionLockedByDevice?: boolean;
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
  motionLockedByDevice = false,
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
          hint={reducedMotionHint(motionLockedByDevice)}
          value={reducedMotion}
          // Held on from the device: the in-app toggle can only ever ADD to it,
          // so while the device holds it there is nothing this control can do.
          disabled={motionLockedByDevice}
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
