import { StyleSheet, View } from "react-native";
import type { ClubMeeting } from "@readers-choice/contract/meetings";
import type { Book } from "@readers-choice/contract/schemas";
import { bookMetaLine } from "@readers-choice/core/book-meta";
import { formatDate } from "@readers-choice/core/date-format";
import { descriptionToPlainText } from "@readers-choice/core/sanitize-description";
import { Text } from "@/components/text";
import { BookCover } from "@/features/books/book-cover";
import { colors, fontFamily, palette, radius, space } from "@/theme";

/**
 * The club's featured book: the next one to read, or the last one read
 * (pickFeaturedMeeting), as on the website's club home.
 */
export function FeaturedBook({
  meeting,
  book,
  label,
}: {
  meeting: ClubMeeting;
  book: Book;
  label: "Upcoming" | "Previous Book";
}) {
  const description = descriptionToPlainText(book.description);
  const meta = bookMetaLine(book);

  return (
    <View style={styles.section}>
      <View>
        <Text variant="bodyBold" accessibilityRole="header">
          {label === "Upcoming" ? "Reading now" : "Last read"}
        </Text>
        <Text variant="caption" muted>
          {formatDate(meeting.meetingDate, "date")}
          {meeting.theme && ` · ${meeting.theme.name}`}
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.book}>
          <BookCover coverUrl={book.coverUrl} title={book.title} size="md" />
          <View style={styles.bookText}>
            <Text variant="lead" style={styles.bookTitle}>
              {book.title}
            </Text>
            <Text muted>by {book.author}</Text>
            {meta && (
              <Text variant="caption" style={styles.meta}>
                {meta}
              </Text>
            )}
          </View>
        </View>
        {description !== "" && (
          <View style={styles.description}>
            <Text variant="caption" style={styles.descriptionText}>
              {description}
            </Text>
          </View>
        )}
        {meeting.details && (
          <View style={styles.details}>
            <Text variant="caption" style={styles.detailsTitle}>
              From the host
            </Text>
            <Text variant="caption">{meeting.details}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  card: {
    gap: space[4],
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space[4],
  },
  book: { flexDirection: "row", gap: space[4] },
  bookText: { flex: 1, gap: space[1] },
  bookTitle: { fontFamily: fontFamily.display },
  meta: { color: palette.dark[500] },
  description: {
    backgroundColor: palette.rust[600],
    borderRadius: radius.md,
    padding: space[4],
  },
  descriptionText: { color: palette.cream[50], lineHeight: 22 },
  details: {
    gap: space[1],
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: space[3],
  },
  detailsTitle: { fontFamily: fontFamily.bodyBold },
});
