import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import App from "../../App";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * What actually gets registered as the root component.
 *
 * Exists so the boundary sits above App — see ErrorBoundary for why that placement
 * is the whole point — and so index.ts, which is .ts and cannot hold JSX, stays a
 * one-line registration.
 *
 * The safe-area provider lives here too, for two reasons.
 *
 * `initialMetrics` is the substantive one. Without it the provider seeds its
 * insets to null and renders NOTHING — not zero insets, nothing — until the
 * native onInsetsChange event arrives, so the first frame of a cold start is
 * blank. `initialWindowMetrics` is read synchronously from TurboModule constants
 * at JS startup, so passing it means there is no such frame.
 *
 * Hoisting is the tidy-up. App had two of these, one per return path, which is
 * what made me believe the provider remounted across the font gate. It does not:
 * both returns render the same element type at the same position with no key, so
 * React reconciles in place and the inset state survives. The remount was never
 * real — but one provider above App is still better than two identical ones
 * inside it, and nothing in App consumes the context, so this is safe.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <App />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
