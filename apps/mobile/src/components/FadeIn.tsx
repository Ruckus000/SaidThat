import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import type { ViewStyle } from "react-native";

export type FadeInProps = {
  children: React.ReactNode;
  reducedMotion: boolean;
  style?: ViewStyle;
  /** Distance in dp the content rises as it fades in. */
  offset?: number;
};

/**
 * Mounts children with a brief fade + rise for momentum between stages.
 * Under reduced motion it renders the children in place with no animation,
 * preserving the exact same content and controls.
 */
export function FadeIn({ children, reducedMotion, style, offset = 10 }: FadeInProps) {
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [reducedMotion, progress]);

  if (reducedMotion) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
