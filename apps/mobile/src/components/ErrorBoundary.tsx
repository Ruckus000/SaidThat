import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { s } from "./styles";

/**
 * The last line before a blank screen.
 *
 * The app had no boundary at any level, so a throw from one of App's own effects
 * — the accelerometer subscription, the AccessibilityInfo listener, the AppState
 * listener — unmounted the whole tree and left the player looking at nothing, with
 * no way back short of force-quitting.
 *
 * It is mounted in index.ts, ABOVE <App/>, and that placement is load-bearing:
 * React only looks for a boundary above the component that threw, and every one of
 * those effects belongs to App itself. A boundary rendered inside App's own JSX
 * cannot catch App's own render or effect throws — it would look right and protect
 * nothing.
 *
 * Deliberately NOT here: the error text, a stack, an onError sink, a report-queue
 * hook. Observability is out of scope for this work and remote delivery is
 * forbidden outright; a fallback that shows a stack trace to a room full of party
 * guests is also just bad copy. The boundary's whole job is to keep a recoverable
 * surface on screen.
 *
 * Honest limit, worth knowing before trusting it: this catches throws during
 * render, lifecycle, and effects. It does NOT catch a rejected promise from an
 * async handler — the unbounded readMotionSample await is not covered here, and
 * needs its own guard at the call site.
 */

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Dev-only, and console-only. In a release build this is where a reporter
    // would go if the project ever allowed one; today it deliberately does not.
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.error("Unhandled error, showing the recovery screen:", error, info.componentStack);
    }
  }

  // Clearing the flag is the whole recovery. React already unmounts the subtree it
  // caught, so the children mount fresh on the next render — a remount-forcing key
  // was tried here and removed: a test that genuinely proves the remount (the
  // child's mount effect running a second time) passes identically without it, so
  // the key was crediting itself with React's own behaviour.
  private recover = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return <View style={s.safe}>{this.props.children}</View>;
    }
    return (
      <View style={s.safe}>
        <View style={[s.app, s.center]}>
          <Text style={s.eyebrow}>SOMETHING WENT WRONG</Text>
          <Text style={s.title}>{"The room\nstopped short."}</Text>
          <Text style={s.copy}>
            The game hit a problem and stopped rather than showing you something wrong. Nothing was
            sent anywhere, and nothing on this device was changed.
          </Text>
          <PrimaryButton label="START OVER" hero onPress={this.recover} />
        </View>
      </View>
    );
  }
}
