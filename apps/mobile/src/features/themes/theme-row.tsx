import { Pressable, StyleSheet, View } from "react-native";
import {
  deleteTheme,
  toggleThemeUpvote,
  type ClubTheme,
} from "@readers-choice/contract/themes";
import { useOperationMutation } from "@/api/queries";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { confirm } from "@/lib/confirm";
import { colors, radius, space } from "@/theme";

/**
 * One theme: upvote toggle and count, how often meetings used it, and delete
 * where `canDelete` (the server's rule) allows. Failures surface through
 * `onError`, which the screen shows once for the list.
 */
export function ThemeRow({
  theme,
  onError,
}: {
  theme: ClubTheme;
  onError: (message: string) => void;
}) {
  const upvote = useOperationMutation(toggleThemeUpvote);
  const remove = useOperationMutation(deleteTheme);
  const busy = upvote.isPending || remove.isPending;

  async function handleDelete() {
    const confirmed = await confirm({
      title: "Delete theme?",
      message: `"${theme.name}" will be removed for everyone in the club.`,
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    remove.mutate(
      { themeId: theme.id },
      { onError: (error) => onError(error.message) }
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.vote}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            theme.userHasUpvoted
              ? `Remove upvote from ${theme.name}`
              : `Upvote ${theme.name}`
          }
          accessibilityState={{
            selected: theme.userHasUpvoted,
            disabled: busy,
          }}
          disabled={busy}
          onPress={() =>
            upvote.mutate(
              { themeId: theme.id },
              { onError: (error) => onError(error.message) }
            )
          }
          style={[
            styles.voteButton,
            theme.userHasUpvoted && styles.voted,
            busy && styles.dimmed,
          ]}
        >
          <Icon
            name="arrow-up"
            size={18}
            color={
              theme.userHasUpvoted
                ? colors.primaryForeground
                : colors.foreground
            }
          />
        </Pressable>
        <Text variant="caption" muted>
          {theme.upvoteCount}
        </Text>
      </View>

      <View style={styles.body}>
        <Text variant="bodyBold">{theme.name}</Text>
        <Text variant="caption" muted>
          {[
            theme.submittedBy && `Suggested by ${theme.submittedBy.name}`,
            theme.timesUsed > 0 && `Used ${theme.timesUsed}×`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>

      {theme.canDelete && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${theme.name}`}
          disabled={busy}
          onPress={handleDelete}
          style={[styles.delete, busy && styles.dimmed]}
          hitSlop={8}
        >
          <Icon name="trash-outline" size={20} color={colors.destructive} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space[3],
  },
  vote: { alignItems: "center", gap: 2, minWidth: 44 },
  voteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  voted: { backgroundColor: colors.primary, borderColor: colors.primary },
  body: { flex: 1, gap: 2 },
  delete: { padding: space[2] },
  dimmed: { opacity: 0.5 },
});
