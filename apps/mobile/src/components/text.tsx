import { Text as NativeText, type TextProps } from "react-native";
import { colors, type, type TextVariant } from "@/theme";

/**
 * Text in one of the app's styles. Use this instead of React Native's Text,
 * which defaults to the system font.
 */
export function Text({
  variant = "body",
  muted = false,
  style,
  ...props
}: TextProps & { variant?: TextVariant; muted?: boolean }) {
  return (
    <NativeText
      {...props}
      style={[
        type[variant],
        { color: muted ? colors.mutedForeground : colors.foreground },
        style,
      ]}
    />
  );
}
