import { ScrollView, Text } from "react-native";

import { MODES } from "../domain/game";
import { setupSectionLabel, setupShowsAccessRoles } from "./presentationLabels";
import { Choice } from "./Choice";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type SetupScreenProps = {
  mode: string;
  accessRole: string;
  onMode: (mode: string) => void;
  onRole: (role: string) => void;
  onStart: () => void;
};

export function SetupScreen({ mode, accessRole, onMode, onRole, onStart }: SetupScreenProps) {
  const roomBeacon = mode === MODES.ROOM_BEACON;
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>CHOOSE THE RITUAL</Text>
      <Text style={s.title}>How is the room playing?</Text>
      <Choice active={roomBeacon} title="Room Beacon" body="Group reads. Holder makes one tap-only group answer." onPress={() => onMode(MODES.ROOM_BEACON)} />
      <Choice active={!roomBeacon} title="Private Relay" body="One player reads and answers. A shutter protects every handoff." onPress={() => onMode(MODES.PRIVATE_RELAY)} />
      <Text style={s.sectionLabel}>{setupSectionLabel(mode)}</Text>
      {setupShowsAccessRoles(mode) ? (
        <>
          <Choice active={accessRole === "holder"} title="I am holding the phone" body="The active prompt is hidden from VoiceOver and TalkBack." onPress={() => onRole("holder")} />
          <Choice active={accessRole === "screen-facing"} title="I am screen-facing" body="I can read the prompt aloud and contribute to the group." onPress={() => onRole("screen-facing")} />
        </>
      ) : (
        <Text style={s.copy}>Tap-only, untimed play. The active player may use VoiceOver or TalkBack; no content is shown during handoff.</Text>
      )}
      <Text style={s.note}>Untimed by design. Controls are at least 56 dp and never depend on motion, audio, or haptics.</Text>
      <PrimaryButton label="Begin round" onPress={onStart} />
    </ScrollView>
  );
}
