import { AccessibilityInfo } from "react-native";

/**
 * Speak a state change that happened without the player touching anything.
 *
 * The screens already carry `accessibilityLiveRegion="polite"`, which is
 * **Android-only** — it does nothing on iOS. So a VoiceOver user reached the
 * verdict, the report confirmation, and the discard notice in silence: the text
 * was on screen and correct, and nothing said it had arrived. Focus was still on
 * whatever they last touched, which by then had been replaced.
 *
 * The live regions stay exactly as they are. This is the iOS half of the same
 * intent, not a replacement, and the two do not double up — TalkBack announces
 * from the live region, VoiceOver from here.
 *
 * ## The rule this module exists to enforce
 *
 * Announce the string that is **already rendered**, never a specially-written
 * one. A parallel set of screen-reader-only copy drifts from the visible copy the
 * moment either is edited, and then the app tells sighted and non-sighted players
 * two different things — which for a game about what is true and what is not is a
 * worse failure than saying nothing. Callers pass the same value they render.
 *
 * Ambient state is deliberately excluded. The score and streak pills change on
 * every round and are already reachable by swiping; announcing them would talk
 * over the verdict a player is waiting for.
 */
export function announce(message: string | null | undefined): void {
  if (!message) return;
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Best-effort, exactly like haptics: an announcement failing must never
    // interrupt play, and there is nothing useful to tell the player about it.
  }
}
