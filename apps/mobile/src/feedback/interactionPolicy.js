/**
 * Interaction policy — which spring preset and which haptic phases each interaction
 * kind uses. Pure data + helpers so the parity rule is testable without React Native.
 *
 * The load-bearing rule: the signature KICK fires on the GAME ANSWER-COMMIT and nothing
 * else, so its "buzzer" fingerprint stays rare and meaningful. Every other interaction
 * uses the calm SNAPPY preset.
 *
 * Haptic phases: `pressInHaptic` fires on contact (pressIn); `commitHaptic` fires on the
 * commit (press). "selection" = a light selection tick, "commit" = a firmer impact.
 */
export const INTERACTIONS = {
  tap: { spring: "snappy", pressInHaptic: "selection", commitHaptic: null },
  primary: { spring: "snappy", pressInHaptic: "selection", commitHaptic: null },
  toggle: { spring: "snappy", pressInHaptic: null, commitHaptic: "selection" },
  answerCommit: { spring: "kick", pressInHaptic: "selection", commitHaptic: "commit" },
};

export function interaction(kind) {
  return INTERACTIONS[kind] ?? INTERACTIONS.tap;
}

export function usesKick(kind) {
  return interaction(kind).spring === "kick";
}
