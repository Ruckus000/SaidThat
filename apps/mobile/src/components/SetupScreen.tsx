import { ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { setupSectionLabel, setupShowsAccessRoles } from "./presentationLabels";
import { Choice } from "./Choice";
import { PrimaryButton } from "./PrimaryButton";
import { ToggleRow } from "./ToggleRow";
import { s } from "./styles";

export type SetupScreenProps = {
  mode: string;
  accessRole: string;
  motionOptIn: boolean;
  onMode: (mode: string) => void;
  onRole: (role: string) => void;
  onMotionOptIn: (enabled: boolean) => void;
  onStart: () => void;
};

export function SetupScreen({
  mode,
  accessRole,
  motionOptIn,
  onMode,
  onRole,
  onMotionOptIn,
  onStart,
}: SetupScreenProps) {
  const roomBeacon = mode === MODES.ROOM_BEACON;
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>SET UP THE ROOM</Text>
      <Text style={s.title}>How is the room playing?</Text>

      <View style={s.group} accessibilityRole="radiogroup">
        <Choice active={roomBeacon} title="Room Beacon" body="The group reads together; the holder makes one tap answer." onPress={() => onMode(MODES.ROOM_BEACON)} />
        <Choice active={!roomBeacon} title="Private Relay" body="One player reads and answers; a shutter guards each handoff." onPress={() => onMode(MODES.PRIVATE_RELAY)} />
      </View>

      <View style={s.group}>
        <Text style={s.sectionLabel}>{setupSectionLabel(mode)}</Text>
        {setupShowsAccessRoles(mode) ? (
          <View style={s.group} accessibilityRole="radiogroup">
            <Choice active={accessRole === "holder"} title="I'm holding the phone" body="The prompt stays hidden from VoiceOver and TalkBack." onPress={() => onRole("holder")} />
            <Choice active={accessRole === "screen-facing"} title="I'm screen-facing" body="I can read the prompt aloud and help the group." onPress={() => onRole("screen-facing")} />
          </View>
        ) : (
          <Text style={s.copy}>One player reads and answers privately. Nothing shows during the handoff.</Text>
        )}
      </View>

      {roomBeacon && (
        <ToggleRow
          title="Tilt to answer"
          hint="Optional for the holder. Tapping always works."
          value={motionOptIn}
          onValueChange={onMotionOptIn}
        />
      )}

      <Text style={s.note}>Untimed · tap-only · large touch targets.</Text>
      <PrimaryButton label="Start playing" onPress={onStart} />
    </ScrollView>
  );
}
