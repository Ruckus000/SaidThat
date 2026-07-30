import Svg, { Path } from "react-native-svg";

import { volt } from "../theme/tokens";
import { UI_ICON_PATHS, UI_ICON_VIEWBOX } from "./uiIconPaths.js";

export type IconName = keyof typeof UI_ICON_PATHS;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

/**
 * A functional UI affordance (settings, navigation) — not part of THE MARK, and
 * never used to express game state. Always decorative: the control that owns it
 * carries the accessibilityLabel, so assistive tech reads one label, not two.
 */
export function Icon({ name, size = 18, color = volt.color.dark.textMuted }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={UI_ICON_VIEWBOX}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={UI_ICON_PATHS[name]} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
