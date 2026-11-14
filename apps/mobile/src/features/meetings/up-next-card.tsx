import { StyleSheet, View } from "react-native";
import type { ClubMeeting } from "@readers-choice/contract/meetings";
import { formatDate } from "@readers-choice/core/date-format";
import { upNextDeadline } from "@readers-choice/core/meeting-schedule";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { palette, radius, space } from "@/theme";
import { MeetingStatusBadge } from "./status-badge";

/**
 * The club home's bold block: the next meeting and what it needs from the
 * reader, as on the website (apps/web/components/book-clubs/up-next-card.tsx).
 * `action` is the button underneath.
 */
export function UpNextCard({
  meeting,
  action,
}: {
  meeting: ClubMeeting | null;
  action: React.ReactNode;
}) {
  const deadline = meeting && upNextDeadline(meeting);
  return (
    <View style={styles.card}>
      <View style={styles.eyebrowRow}>
        <Text variant="eyebrow" style={[styles.soft, styles.eyebrow]}>
          Up next
        </Text>
        {meeting && <MeetingStatusBadge meeting={meeting} inverted />}
      </View>
      <Text variant="title" style={styles.title} accessibilityRole="header">
        {meeting
          ? (meeting.theme?.name ?? "Next meeting")
          : "No meeting scheduled"}
      </Text>
      {meeting ? (
        <View style={styles.facts}>
          <Fact icon="calendar-outline">
            {formatDate(meeting.meetingDate, "meeting")}
          </Fact>
          {deadline && (
            <Fact icon="time-outline">
              {deadline.at
                ? `${deadline.label} ${formatDate(deadline.at, "deadline")}`
                : deadline.label}
            </Fact>
          )}
        </View>
      ) : (
        <Text variant="caption" style={styles.soft}>
          Help pick what comes next by suggesting a theme.
        </Text>
      )}
      <View style={styles.action}>{action}</View>
    </View>
  );
}

function Fact({
  icon,
  children,
}: {
  icon: "calendar-outline" | "time-outline";
  children: string;
}) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={16} color={palette.rust[100]} />
      <Text variant="caption" style={[styles.soft, styles.factText]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
    backgroundColor: palette.rust[600],
    borderRadius: radius.xl,
    padding: space[5],
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[2],
  },
  eyebrow: { fontSize: 12, letterSpacing: 1 },
  soft: { color: palette.rust[100] },
  title: { color: palette.cream[50], fontSize: 24, lineHeight: 30 },
  facts: { gap: space[1] },
  fact: { flexDirection: "row", alignItems: "center", gap: space[2] },
  factText: { flexShrink: 1 },
  action: { marginTop: space[3] },
});
