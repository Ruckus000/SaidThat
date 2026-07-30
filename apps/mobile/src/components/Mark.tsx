import Svg, { Path } from "react-native-svg";

import { volt } from "../theme/tokens";
import { MARK_PATHS, MARK_VIEWBOX } from "./markPaths.js";

export type MarkName = keyof typeof MARK_PATHS;

export type MarkProps = {
  name: MarkName;
  size?: number;
  color?: string;
  /** Marks are decorative by default — meaning always lives in an adjacent word. */
  decorative?: boolean;
  label?: string;
};

/**
 * THE MARK — renders one bespoke quotation glyph. Legible by shape alone; carries no
 * color-only meaning and never a checkmark. When paired with a word it stays decorative
 * to assistive tech; pass `decorative={false}` + `label` only for a standalone use.
 */
export function Mark({ name, size = 24, color = volt.color.dark.textPrimary, decorative = true, label }: MarkProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={decorative ? undefined : label}
    >
      <Path d={MARK_PATHS[name]} fill={color} />
    </Svg>
  );
}
