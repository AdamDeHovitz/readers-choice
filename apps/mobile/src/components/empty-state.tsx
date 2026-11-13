import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./text";

/** Placeholder for a list or screen with nothing to show yet. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.box}>
      <Text variant="bodyBold" style={styles.center}>
        {title}
      </Text>
      {description && (
        <Text variant="caption" muted style={styles.center}>
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space[2],
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: space[6],
    paddingVertical: space[10],
  },
  center: { textAlign: "center" },
});
