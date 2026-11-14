import type { Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableLink } from "./pressable-link";
import { Text } from "./text";

/** A tappable row that opens another screen: icon, label, chevron. */
export function LinkRow({
  href,
  icon,
  label,
  detail,
}: {
  href: Href;
  icon: IconName;
  label: string;
  /** Muted text under the label. */
  detail?: string;
}) {
  return (
    <PressableLink
      href={href}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={styles.row}
    >
      <Icon name={icon} color={colors.primary} />
      <View style={styles.text}>
        <Text variant="bodyBold">{label}</Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" color={colors.mutedForeground} />
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: 56,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  text: { flex: 1 },
});
