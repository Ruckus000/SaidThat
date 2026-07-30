import { Pressable, ScrollView, Text, View } from "react-native";

import { MODES } from "../domain/game";
import { roleCaption, setupShowsAccessRoles } from "./presentationLabels";
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
      <Text style={s.title}>{"HOW'S THE ROOM\nPLAYING?"}</Text>

      <View style={[s.group, { flex: 1, justifyContent: "center" }]} accessibilityRole="radiogroup">
        <Choice
          active={roomBeacon}
          title="ROOM BEACON"
          body="Everyone reads. The holder taps once."
          mark="open"
          onPress={() => onMode(MODES.ROOM_BEACON)}
        />
        <Choice
          active={!roomBeacon}
          title="PRIVATE RELAY"
          body="Pass the phone. A shutter guards each turn."
          mark="close"
          onPress={() => onMode(MODES.PRIVATE_RELAY)}
        />
      </View>

      {setupShowsAccessRoles(mode) ? (
        <View style={s.group}>
          <View style={s.segment} accessibilityRole="radiogroup">
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: accessRole === "holder" }}
              onPress={() => onRole("holder")}
              style={[s.segmentItem, accessRole === "holder" && s.segmentItemOn]}
            >
              <Text style={[s.segmentText, accessRole === "holder" && s.segmentTextOn]}>
                I'M HOLDING
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: accessRole === "screen-facing" }}
              onPress={() => onRole("screen-facing")}
              style={[s.segmentItem, accessRole === "screen-facing" && s.segmentItemOn]}
            >
              <Text style={[s.segmentText, accessRole === "screen-facing" && s.segmentTextOn]}>
                SCREEN-FACING
              </Text>
            </Pressable>
          </View>
          <Text style={[s.note, { textAlign: "center" }]}>{roleCaption(accessRole)}</Text>
        </View>
      ) : (
        <Text style={[s.note, { textAlign: "center" }]}>
          Untimed and tap-only. An interrupted turn is discarded, never revealed.
        </Text>
      )}

      {roomBeacon && (
        <ToggleRow
          title="Tilt to answer"
          hint="Optional for the holder. Tapping always works."
          value={motionOptIn}
          onValueChange={onMotionOptIn}
        />
      )}

      <PrimaryButton label="LET'S PLAY" onPress={onStart} />
    </ScrollView>
  );
}
