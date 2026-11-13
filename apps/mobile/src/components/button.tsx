import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./text";

/** The app's button. `primary` for the main action on a screen. */
export function Button({
  title,
  variant = "primary",
  pending = false,
  disabled,
  ...props
}: Omit<PressableProps, "children"> & {
  title: string;
  variant?: "primary" | "secondary";
  /** Shows a spinner and blocks presses while an action runs. */
  pending?: boolean;
}) {
  const inactive = disabled || pending;
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: pending }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        (pressed || inactive) && styles.dimmed,
      ]}
      {...props}
    >
      {pending ? (
        <ActivityIndicator
          color={primary ? colors.primaryForeground : colors.foreground}
        />
      ) : (
        <Text
          variant="bodyBold"
          style={{
            color: primary ? colors.primaryForeground : colors.foreground,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space[6],
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dimmed: { opacity: 0.6 },
});
