import { Text, View } from "react-native";

import { FIXTURE_DISCLOSURE } from "./presentationLabels";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type HomeScreenProps = {
  onStart: () => void;
  localFixtures: boolean;
};

export function HomeScreen({ onStart, localFixtures }: HomeScreenProps) {
  return (
    <View style={s.center}>
      <Text style={s.eyebrow}>ONE PHONE · REAL OR FAKE</Text>
      <Text style={s.title}>Read the room.{"\n"}Trust the reveal.</Text>
      <Text style={s.copy}>A local, tap-only party game about public voice—not a social feed.</Text>
      <PrimaryButton label="Start a room" onPress={onStart} />
      <Text style={s.note}>No account. No live social feed. No telemetry.</Text>
      {localFixtures && <Text style={s.fixture}>{FIXTURE_DISCLOSURE}</Text>}
    </View>
  );
}
