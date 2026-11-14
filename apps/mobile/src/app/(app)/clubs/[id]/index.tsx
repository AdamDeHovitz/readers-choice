import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { listClubMeetings } from "@readers-choice/contract/meetings";
import {
  pickFeaturedMeeting,
  pickUpcomingMeeting,
} from "@readers-choice/core/meeting-schedule";
import { useOperationQuery } from "@/api/queries";
import { Button } from "@/components/button";
import { LinkRow } from "@/components/link-row";
import { QueryError } from "@/components/query-error";
import { Text } from "@/components/text";
import { FeaturedBook } from "@/features/meetings/featured-book";
import { UpNextCard } from "@/features/meetings/up-next-card";
import { colors, space } from "@/theme";

/** A club's home (meetings.list): what's next, the featured book, and the club's screens. */
export default function ClubHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useOperationQuery(listClubMeetings, { bookClubId: id });
  const data = query.data;

  const now = new Date();
  const upcoming = data ? pickUpcomingMeeting(data.meetings, now) : null;
  const featured = data
    ? pickFeaturedMeeting(
        data.meetings.filter((m) => m.selectedBook),
        now
      )
    : null;
  const count = data?.meetings.length ?? 0;

  return (
    <>
      <Stack.Screen options={{ title: data?.club.name ?? "" }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {query.isPending ? (
          <Text muted accessibilityLiveRegion="polite">
            Loading the club…
          </Text>
        ) : query.isError ? (
          <QueryError error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            <UpNextCard
              meeting={upcoming}
              action={
                // The meeting screen comes next (#75); until then, a club with
                // nothing scheduled can still help pick what's next.
                !upcoming && (
                  <Button
                    title="Suggest a theme"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/clubs/[id]/themes",
                        params: { id },
                      })
                    }
                  />
                )
              }
            />
            {featured?.meeting.selectedBook && (
              <FeaturedBook
                meeting={featured.meeting}
                book={featured.meeting.selectedBook}
                label={featured.label}
              />
            )}
            <View style={styles.links}>
              <LinkRow
                href={{ pathname: "/clubs/[id]/schedule", params: { id } }}
                icon="calendar-outline"
                label="Schedule"
                detail={`${count} ${count === 1 ? "meeting" : "meetings"}`}
              />
              <LinkRow
                href={{ pathname: "/clubs/[id]/themes", params: { id } }}
                icon="sparkles-outline"
                label="Themes"
                detail="Suggest and upvote themes"
              />
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { gap: space[8], padding: space[6], paddingBottom: space[12] },
  links: { gap: space[3] },
});
