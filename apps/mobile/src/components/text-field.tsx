import { useId } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, space, type } from "@/theme";
import { Text } from "./text";

/** A labelled text input. */
export function TextField({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const id = useId();
  return (
    <View style={styles.field}>
      <Text variant="bodyBold" nativeID={id}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        aria-labelledby={id}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  input: {
    ...type.body,
    color: colors.foreground,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: space[4],
  },
});
