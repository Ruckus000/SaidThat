import { ScrollView, Text } from "react-native";

import { MODES } from "../domain/game";
import { setupSectionLabel, setupShowsAccessRoles } from "./presentationLabels";
import { Choice } from "./Choice";
import { PrimaryButton } from "./PrimaryButton";
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
      {roomBeacon && (
        <>
          <Text style={s.sectionLabel}>OPTIONAL TILT</Text>
          <Choice
            active={motionOptIn}
            role="switch"
            title="Enable tilt answer"
            body="Holder may tilt to answer after calibration. Tap buttons always work immediately."
            onPress={() => onMotionOptIn(!motionOptIn)}
          />
        </>
      )}
      <Text style={s.note}>Untimed by design. Controls are at least 56 dp; tap paths remain complete with or without tilt.</Text>
      <PrimaryButton label="Start playing" onPress={onStart} />
    </ScrollView>
  );
}
