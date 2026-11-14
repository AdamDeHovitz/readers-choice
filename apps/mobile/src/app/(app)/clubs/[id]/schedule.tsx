import { useLocalSearchParams } from "expo-router";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { listClubMeetings } from "@readers-choice/contract/meetings";
import { splitMeetingTimeline } from "@readers-choice/core/meeting-schedule";
import { useOperationQuery } from "@/api/queries";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { Text } from "@/components/text";
import { MeetingRow } from "@/features/meetings/meeting-row";
import { colors, radius, space } from "@/theme";

/** A club's meetings (meetings.list): upcoming soonest first, then past. */
export default function ClubSchedule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOperationQuery(listClubMeetings, { bookClubId: id });
  const meetings = query.data?.meetings ?? [];
  const { upcoming, past } = splitMeetingTimeline(meetings);

  const sections = [
    { title: "Upcoming", upcoming: true, data: upcoming },
    { title: "Past", upcoming: false, data: past },
  ].filter((section) => section.data.length > 0);

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(meeting) => meeting.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text
          variant="bodyBold"
          accessibilityRole="header"
          style={styles.sectionHeader}
        >
          {section.title}
        </Text>
      )}
      renderItem={({ item, index, section }) => (
        <View
          style={[
            styles.item,
            index === 0 && styles.first,
            index === section.data.length - 1 && styles.last,
          ]}
        >
          <MeetingRow meeting={item} upcoming={section.upcoming} />
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        query.data ? (
          <Text muted style={styles.count}>
            {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
          </Text>
        ) : undefined
      }
      ListEmptyComponent={
        query.isPending ? (
          <Text muted accessibilityLiveRegion="polite">
            Loading the schedule…
          </Text>
        ) : query.isError ? (
          <QueryError error={query.error} retry={() => void query.refetch()} />
        ) : (
          <EmptyState
            title="No meetings yet"
            description="Scheduled meetings will show up here."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: space[6], paddingBottom: space[12] },
  count: { marginBottom: space[2] },
  sectionHeader: { marginTop: space[4], marginBottom: space[2] },
  // Each section reads as one rounded card of rows, like the web's list.
  item: {
    overflow: "hidden",
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
});
