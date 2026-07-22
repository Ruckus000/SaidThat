import * as Haptics from "expo-haptics";

/**
 * Optional haptic feedback. Every call is a best-effort no-op when disabled or
 * when the platform lacks a Taptic engine — haptics never gate play, encode a
 * truth verdict, or differ by correctness. Two neutral weights mark two moments:
 * a firmer tick when the room commits, a lighter tick when the reveal lands.
 */
export function commitFeedback(enabled: boolean): void {
  fire(enabled, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function revealFeedback(enabled: boolean): void {
  fire(enabled, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

function fire(enabled: boolean, run: () => Promise<void>): void {
  if (!enabled) return;
  try {
    run().catch(() => {});
  } catch {
    // Feedback is best-effort; a haptics failure must never interrupt the game.
  }
}
