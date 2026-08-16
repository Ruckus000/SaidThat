import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { REPORT_REASONS, isDisplayAuthentic } from "../domain/contentRules";
import { volt } from "../theme/tokens";
import { announce } from "../feedback/announce";
import {
  continueLabel,
  decoyDisclosure,
  reportStatusMessage,
  reviewSourceStatus,
  reviewTruthLabel,
} from "./presentationLabels";
import { FadeIn } from "./FadeIn";
import { Mark } from "./Mark";
import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

export type ReviewCard = {
  authentic: boolean;
  quote: string;
  explanation: string;
  contentState: string;
  /** Present only on curated authentic cards; drives the source line. */
  sourceRecord?: { retained: boolean; url: string };
  /** "ai_assisted" triggers the drafting disclosure below the explanation. */
  decoyMethod?: string;
  fixtureOnly?: boolean;
};

export type ReviewScreenProps = {
  card: ReviewCard;
  reportStatus: string | null;
  reportBusy: boolean;
  roundIndex: number;
  totalRounds: number;
  reducedMotion: boolean;
  onReport: (reason: string) => void;
  onContinue: () => void;
};

export function ReviewScreen({
  card,
  reportStatus,
  reportBusy,
  roundIndex,
  totalRounds,
  reducedMotion,
  onReport,
  onContinue,
}: ReviewScreenProps) {
  const truth = reviewTruthLabel(card);
  const authentic = isDisplayAuthentic(card);
  const c = volt.color.dark;
  const truthColor = authentic ? c.lime : c.pink;
  const next = continueLabel({ roundIndex, totalRounds });
  const statusMessage = reportStatusMessage(reportStatus);
  const disclosure = decoyDisclosure(card);

  // The live region below is Android-only. Without this, a VoiceOver user tapped
  // a report chip and heard nothing at all — the confirmation appeared on screen
  // while focus stayed on a chip that had just been disabled. Announces the same
  // value it renders, so the two can never disagree.
  useEffect(() => {
    announce(statusMessage);
  }, [statusMessage]);

  return (
    <ScrollView contentContainerStyle={s.setup}>
      <FadeIn reducedMotion={reducedMotion} offset={14}>
        <View style={s.truthRow}>
          <Mark name={authentic ? "spoken" : "struck"} size={30} color={truthColor} />
          <Text style={[s.truthLabel, { color: truthColor }]}>{truth}</Text>
        </View>
        <Text style={s.quoteSmall}>“{card.quote}”</Text>
        <Text style={s.copy}>{card.explanation}</Text>
        {disclosure ? <Text style={s.note}>{disclosure}</Text> : null}
      </FadeIn>
      <Text style={s.note}>Source status: {reviewSourceStatus(card)}.</Text>
      <View style={s.report}>
        <Text style={s.sectionLabel}>SEE A CONTENT ISSUE?</Text>
        <Text style={s.note}>
          Reports save locally with only card ID, reason, deck version, timestamp, and a local run/round stamp for this device. No player identity or free text.
        </Text>
        <View style={s.reportChips}>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.code}
              accessibilityRole="button"
              accessibilityLabel={reason.accessibilityLabel}
              disabled={reportBusy}
              onPress={() => onReport(reason.code)}
              style={[s.reportChip, reportBusy && s.reportChipBusy]}
            >
              <Text style={s.reportChipText}>{reason.chipLabel}</Text>
            </Pressable>
          ))}
        </View>
        {statusMessage && (
          <Text
            accessibilityLiveRegion="polite"
            style={reportStatus === "queued" ? s.success : s.error}
          >
            {statusMessage}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minHeight: 16 }} />
      <PrimaryButton label={next} onPress={onContinue} />
    </ScrollView>
  );
}
