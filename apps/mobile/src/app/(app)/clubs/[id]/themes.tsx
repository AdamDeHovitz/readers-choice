import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { listThemes } from "@readers-choice/contract/themes";
import {
  countThemes,
  themesToShow,
  type ThemeFilter,
} from "@readers-choice/core/themes";
import { useOperationQuery } from "@/api/queries";
import { Alert } from "@/components/alert";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { SegmentedControl } from "@/components/segmented-control";
import { Text } from "@/components/text";
import { SuggestTheme } from "@/features/themes/suggest-theme";
import { ThemeRow } from "@/features/themes/theme-row";
import { colors, space } from "@/theme";

const EMPTY: Record<ThemeFilter, { title: string; description: string }> = {
  unused: {
    title: "No unused themes",
    description:
      "Suggest one above. Members upvote the themes they'd like to read next.",
  },
  used: {
    title: "No themes used yet",
    description: "Themes show here once a meeting uses them.",
  },
  all: {
    title: "No themes yet",
    description:
      "Suggest the first one. Members upvote the themes they'd like to read next.",
  },
};

/** A club's themes (themes.list): suggest, upvote and delete, like the website. */
export default function ClubThemes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themes = useOperationQuery(listThemes, { bookClubId: id });
  const [filter, setFilter] = useState<ThemeFilter>("unused");
  const [actionError, setActionError] = useState<string | null>(null);

  const all = themes.data?.themes ?? [];
  const counts = countThemes(all);

  return (
    <FlatList
      style={styles.screen}
      data={themesToShow(all, filter)}
      keyExtractor={(theme) => theme.id}
      renderItem={({ item }) => (
        <ThemeRow theme={item} onError={setActionError} />
      )}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={themes.isRefetching}
          onRefresh={() => void themes.refetch()}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text muted>
            Suggest themes for future meetings and upvote your favorites.
          </Text>
          <SuggestTheme bookClubId={id} />
          <SegmentedControl
            label="Filter themes"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "unused", label: `Unused (${counts.unused})` },
              { value: "used", label: `Used (${counts.used})` },
              { value: "all", label: `All (${counts.all})` },
            ]}
          />
          {actionError && <Alert message={actionError} />}
        </View>
      }
      ListEmptyComponent={
        themes.isPending ? (
          <Text muted accessibilityLiveRegion="polite">
            Loading themes…
          </Text>
        ) : themes.isError ? (
          <QueryError
            error={themes.error}
            retry={() => void themes.refetch()}
          />
        ) : (
          <EmptyState {...EMPTY[filter]} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  list: { gap: space[3], padding: space[6], paddingBottom: space[12] },
  header: { gap: space[4], marginBottom: space[2] },
});
