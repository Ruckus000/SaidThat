import { ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ReviewCard = {
  authentic: boolean;
  quote: string;
  explanation: string;
  contentState: string;
};

export type ReviewScreenProps = {
  card: ReviewCard;
  reportStatus: string | null;
  reportBusy: boolean;
  onReport: (reason: string) => void;
  onContinue: () => void;
};

export function ReviewScreen({ card, reportStatus, reportBusy, onReport, onContinue }: ReviewScreenProps) {
  const truth = card.contentState === "fixture-authentic" ? "SIMULATED AUTHENTIC FIXTURE" : card.authentic ? "AUTHENTIC" : "FABRICATED FOR THIS GAME";
  return (
    <ScrollView contentContainerStyle={s.setup}>
      <Text style={s.eyebrow}>{truth}</Text>
      <Text style={s.title}>“{card.quote}”</Text>
      <Text style={s.copy}>{card.explanation}</Text>
      <Text style={s.note}>Source status: {card.contentState === "fixture-authentic" ? "development simulation — not a source-verified production card" : card.authentic ? "editorial source record required" : "game fixture"}.</Text>
      <View style={s.report}>
        <Text style={s.sectionLabel}>SEE A CONTENT ISSUE?</Text>
        <Text style={s.note}>Reports save locally with only card ID, reason, deck version, and timestamp. No player identity or free text is collected.</Text>
        <PrimaryButton label={reportBusy ? "Queuing report…" : "Report wrong attribution"} secondary onPress={() => onReport("wrong-attribution")} disabled={reportBusy} />
        <PrimaryButton label="Report harmful content" secondary onPress={() => onReport("harmful-content")} disabled={reportBusy} />
        <PrimaryButton label="Report another issue" secondary onPress={() => onReport("other")} disabled={reportBusy} />
        {reportStatus === "queued" && <Text accessibilityLiveRegion="polite" style={s.success}>Saved locally. It will remain queued until a reviewed delivery path exists.</Text>}
        {reportStatus === "failed" && <Text accessibilityLiveRegion="polite" style={s.error}>Could not save the report. Your game can continue safely.</Text>}
      </View>
      <PrimaryButton label="Next prompt" onPress={onContinue} />
    </ScrollView>
  );
}
