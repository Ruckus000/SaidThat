import { ScrollView, Text, View } from "react-native";

import { volt } from "../theme/tokens";
import { PRIVATE_SHUTTER_RECOVERY, privateDiscardNotice } from "./presentationLabels";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type PrivateRecovery = "discarded-prior-turn" | "protected-after-commit";

export type PrivateShutterScreenProps = {
  onReady: () => void;
  /**
   * Why this shutter is showing a recovery notice. Prefer the reducer kind;
   * `discardedPriorTurn` remains as a boolean alias for the unanswered case.
   */
  privateRecovery?: PrivateRecovery | null;
  /** @deprecated Prefer privateRecovery="discarded-prior-turn". */
  discardedPriorTurn?: boolean;
};

export function PrivateShutterScreen({
  onReady,
  privateRecovery = null,
  discardedPriorTurn = false,
}: PrivateShutterScreenProps) {
  // The discard used to be silent: the reducer recorded it and nothing read the
  // flag, so a player whose turn was thrown away by a notification was told only
  // that it "was discarded" hypothetically, in copy shown on every handoff.
  const recovery =
    privateRecovery ?? (discardedPriorTurn ? "discarded-prior-turn" : null);
  const notice = privateDiscardNotice(recovery);
  return (
    <View style={{ flex: 1 }}>
      <View style={s.shutterPill}>
        <Text style={s.shutterPillText}>PRIVATE HANDOFF</Text>
      </View>
      {/*
        The body scrolls, the action does not. At a large accessibility text size
        this block outgrows the viewport, and as a fixed View the button below it
        was pushed off-screen — leaving the protected handoff with no way forward
        and the run stuck behind a shutter that cannot be dismissed.

        The PrimaryButton stays OUTSIDE the ScrollView deliberately: the one
        control that advances the handoff must never be something the player has
        to discover by scrolling.
      */}
      <ScrollView contentContainerStyle={s.centerScroll}>
        <Mark name="close" size={88} color={volt.color.dark.lime} />
        <Text style={s.eyebrowPink}>PRIVATE RELAY</Text>
        <Text style={s.displayL}>{"PASS THE\nPHONE."}</Text>
        {notice && (
          <Text accessibilityLiveRegion="polite" style={s.success}>
            {notice}
          </Text>
        )}
        <Text style={s.copy}>{PRIVATE_SHUTTER_RECOVERY}</Text>
      </ScrollView>
      <PrimaryButton label="I HAVE THE PHONE — REVEAL MY TURN" onPress={onReady} />
    </View>
  );
}
