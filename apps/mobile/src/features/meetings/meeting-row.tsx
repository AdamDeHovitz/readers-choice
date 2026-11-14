import { StyleSheet, View } from "react-native";
import type { ClubMeeting } from "@readers-choice/contract/meetings";
import { formatDate } from "@readers-choice/core/date-format";
import { Text } from "@/components/text";
import { BookCover } from "@/features/books/book-cover";
import { colors, palette, radius, space } from "@/theme";
import { MeetingStatusBadge } from "./status-badge";

/**
 * One meeting on a club's schedule: a date tile, its theme, and its book or
 * status, as on the website (apps/web/components/meetings/meeting-timeline.tsx).
 */
export function MeetingRow({
  meeting,
  upcoming,
}: {
  meeting: ClubMeeting;
  /** Upcoming meetings get the sage date tile. */
  upcoming: boolean;
}) {
  const book = meeting.selectedBook;
  const title =
    meeting.theme?.name ?? formatDate(meeting.meetingDate, "monthYear");

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[
        title,
        formatDate(meeting.meetingDate, "date"),
        book ? `${book.title} by ${book.author}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <View
        style={[styles.tile, upcoming ? styles.tileUpcoming : styles.tilePast]}
      >
        <Text
          variant="caption"
          style={[styles.month, upcoming && styles.monthUpcoming]}
        >
          {formatDate(meeting.meetingDate, "shortMonth")}
        </Text>
        <Text variant="bodyBold" style={styles.day}>
          {formatDate(meeting.meetingDate, "day")}
        </Text>
      </View>
      <View style={styles.text}>
        <Text variant="bodyBold" numberOfLines={1}>
          {title}
        </Text>
        {book ? (
          <Text variant="caption" muted numberOfLines={1}>
            {book.title}{" "}
            <Text variant="caption" style={styles.author}>
              by {book.author}
            </Text>
          </Text>
        ) : (
          <MeetingStatusBadge meeting={meeting} />
        )}
      </View>
      {book && (
        <BookCover coverUrl={book.coverUrl} title={book.title} size="xs" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    backgroundColor: colors.card,
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tileUpcoming: { backgroundColor: palette.sage[200] },
  tilePast: { backgroundColor: colors.muted },
  month: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  monthUpcoming: { color: palette.sage[800] },
  day: { fontSize: 20, lineHeight: 22 },
  text: { flex: 1, gap: space[1] },
  author: { color: palette.dark[500] },
});
