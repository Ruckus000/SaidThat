import { View } from "react-native";

import { volt } from "../theme/tokens";
import { Mark } from "./Mark";
import { s } from "./styles";

export type StreakSparksProps = {
  /**
   * How many sparks to draw. Context pills show a single spark as a marker; the
   * reveal pill shows one per streak step (see `streakSparkCount`).
   */
  count: number;
  size?: number;
  color?: string;
};

/**
 * Streak sparks, drawn as SVG MARK glyphs rather than a text character so they
 * render identically on every device. Purely decorative — the adjacent label
 * already states the streak in words, so assistive tech reads it once.
 */
export function StreakSparks({ count, size = 12, color = volt.color.dark.lime }: StreakSparksProps) {
  if (!(count >= 1)) return null;
  return (
    <View style={s.sparkRow}>
      {Array.from({ length: count }, (_, i) => (
        <Mark key={i} name="spark" size={size} color={color} />
      ))}
    </View>
  );
}
