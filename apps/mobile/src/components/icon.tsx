// The app's one icon set. Import Ionicons from its own entry point so only
// its font is bundled, not every set @expo/vector-icons ships.
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { colors } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** A decorative icon; label the control it sits in, not the icon. */
export function Icon({
  name,
  size = 20,
  color = colors.foreground,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
