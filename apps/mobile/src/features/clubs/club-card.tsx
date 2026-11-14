import { StyleSheet, View } from "react-native";
import type { MyClub } from "@readers-choice/contract/clubs";
import { PressableLink } from "@/components/pressable-link";
import { Text } from "@/components/text";
import { colors, radius, space } from "@/theme";

/** One of the member's clubs, as on the website's dashboard. Opens its home. */
export function ClubCard({ club }: { club: MyClub }) {
  return (
    <PressableLink
      href={{ pathname: "/clubs/[id]", params: { id: club.id } }}
      style={styles.card}
      accessibilityLabel={club.name}
      accessibilityHint="Opens the club"
    >
      <View style={styles.header}>
        <Text variant="bodyBold" style={styles.name} numberOfLines={1}>
          {club.name}
        </Text>
        {club.isAdmin && (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              Admin
            </Text>
          </View>
        )}
      </View>
      {club.description && (
        <Text variant="caption" muted numberOfLines={2}>
          {club.description}
        </Text>
      )}
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[1],
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space[4],
  },
  header: { flexDirection: "row", alignItems: "center", gap: space[2] },
  name: { flexShrink: 1 },
  badge: {
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
  },
  badgeText: { color: colors.mutedForeground },
});
