import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { listMyClubs } from "@readers-choice/contract/clubs";
import { useOperationQuery } from "@/api/queries";
import { sessions, useSession } from "@/auth";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { ClubCard } from "@/features/clubs/club-card";
import { colors, space } from "@/theme";

/** The member's clubs (clubs.mine), like the website's dashboard. */
export default function MyClubs() {
  const session = useSession();
  const clubs = useOperationQuery(listMyClubs, {});
  const firstName =
    session.status === "signedIn" ? session.user.name.split(" ")[0] : "";

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={clubs.data?.clubs ?? []}
        keyExtractor={(club) => club.id}
        renderItem={({ item }) => <ClubCard club={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={clubs.isRefetching}
            onRefresh={() => void clubs.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              My clubs
            </Text>
            <Text muted>Welcome back, {firstName}.</Text>
          </View>
        }
        ListEmptyComponent={
          clubs.isPending ? (
            <Text muted accessibilityLiveRegion="polite">
              Loading your clubs…
            </Text>
          ) : clubs.isError ? (
            <QueryError
              error={clubs.error}
              retry={() => void clubs.refetch()}
            />
          ) : (
            <EmptyState
              title="No book clubs yet"
              description="Ask a club admin for an invite link, or start a club on the website."
            />
          )
        }
        ListFooterComponent={
          <Button
            title="Sign out"
            variant="secondary"
            onPress={() => void sessions.signOut()}
          />
        }
        ListFooterComponentStyle={styles.footer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3], paddingBottom: space[8] },
  header: { gap: space[1], marginBottom: space[3] },
  footer: { marginTop: space[6] },
});
