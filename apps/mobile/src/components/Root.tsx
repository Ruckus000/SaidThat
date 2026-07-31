import App from "../../App";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * What actually gets registered as the root component.
 *
 * Exists so the boundary sits above App — see ErrorBoundary for why that placement
 * is the whole point — and so index.ts, which is .ts and cannot hold JSX, stays a
 * one-line registration.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
