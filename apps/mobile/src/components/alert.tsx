import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./text";

/** An error message for the user, announced by screen readers. */
export function Alert({ message }: { message: string }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.alert}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
    backgroundColor: colors.card,
    padding: space[3],
  },
  text: { color: colors.destructive },
});
