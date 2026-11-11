import { StyleSheet, View } from "react-native";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { colors, space } from "@/theme";

/** Welcome screen. Becomes the signed-out landing once sign-in exists. */
export default function Welcome() {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="eyebrow" style={styles.eyebrow}>
          Book club, sorted
        </Text>
        <Text variant="hero" accessibilityRole="header">
          Readers&apos; Choice
        </Text>
        <Text variant="lead" muted style={styles.lead}>
          Pick your next read together, vote on it fairly, and remember the ones
          you loved.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  eyebrow: { color: colors.primary },
  lead: { marginTop: space[4] },
});
