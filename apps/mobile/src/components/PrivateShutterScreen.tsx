import { Text, View } from "react-native";

import { volt } from "../theme/tokens";
import { PRIVATE_SHUTTER_RECOVERY, privateDiscardNotice } from "./presentationLabels";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PrivateShutterScreenProps = {
  onReady: () => void;
  /** True when the reducer actually discarded a protected turn to get here. */
  discardedPriorTurn?: boolean;
};

export function PrivateShutterScreen({ onReady, discardedPriorTurn = false }: PrivateShutterScreenProps) {
  // The discard used to be silent: the reducer recorded it and nothing read the
  // flag, so a player whose turn was thrown away by a notification was told only
  // that it "was discarded" hypothetically, in copy shown on every handoff.
  const notice = privateDiscardNotice(discardedPriorTurn);
  return (
    <View style={{ flex: 1 }}>
      <View style={s.shutterPill}>
        <Text style={s.shutterPillText}>PRIVATE HANDOFF</Text>
      </View>
      <View style={[s.center, { gap: 14 }]}>
        <Mark name="close" size={88} color={volt.color.dark.lime} />
        <Text style={s.eyebrowPink}>PRIVATE RELAY</Text>
        <Text style={s.displayL}>{"PASS THE\nPHONE."}</Text>
        {notice && (
          <Text accessibilityLiveRegion="polite" style={s.success}>
            {notice}
          </Text>
        )}
        <Text style={s.copy}>{PRIVATE_SHUTTER_RECOVERY}</Text>
      </View>
      <PrimaryButton label="I HAVE THE PHONE — REVEAL MY TURN" onPress={onReady} />
    </View>
  );
}
