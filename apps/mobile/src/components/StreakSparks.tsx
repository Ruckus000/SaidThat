import { View } from "react-native";

import { volt } from "../theme/tokens";
import { streakSparkCount } from "./presentationLabels";
import { Mark } from "./Mark";
import { s } from "./styles";

export type StreakSparksProps = {
  streak: number;
  size?: number;
  color?: string;
  /** Render a single spark regardless of streak length (recap stat row). */
  single?: boolean;
};

/**
 * The streak spark row, drawn as SVG MARK glyphs rather than a text character.
 * Purely decorative — the adjacent label already says the streak in words, so
 * assistive tech reads the number once.
 */
export function StreakSparks({
  streak,
  size = 12,
  color = volt.color.dark.lime,
  single = false,
}: StreakSparksProps) {
  const count = single ? 1 : streakSparkCount(streak);
  if (count < 1) return null;
  return (
    <View style={s.sparkRow}>
      {Array.from({ length: count }, (_, i) => (
        <Mark key={i} name="spark" size={size} color={color} />
      ))}
    </View>
  );
}
