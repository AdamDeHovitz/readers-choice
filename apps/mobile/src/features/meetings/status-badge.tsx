import { StyleSheet, View } from "react-native";
import {
  getMeetingPhase,
  MEETING_PHASE_LABELS,
  type MeetingPhase,
  type MeetingSchedule,
} from "@readers-choice/core/meeting-schedule";
import { Text } from "@/components/text";
import { colors, palette, radius, space } from "@/theme";

// The web badge's variants: active (sage) while members can act, rust once
// a book is picked, muted while waiting on an admin.
const TONES: Record<MeetingPhase, { background: string; color: string }> = {
  nominating: { background: palette.sage[200], color: palette.sage[800] },
  voting: { background: palette.sage[200], color: palette.sage[800] },
  awaiting_finalization: {
    background: colors.muted,
    color: colors.mutedForeground,
  },
  finalized: { background: colors.primary, color: colors.primaryForeground },
};

/** A meeting's phase, as decided by packages/core/meeting-schedule. */
export function MeetingStatusBadge({
  meeting,
  inverted = false,
}: {
  meeting: MeetingSchedule;
  /** On a rust card: cream badge with rust text. */
  inverted?: boolean;
}) {
  const phase = getMeetingPhase(meeting);
  const tone = inverted
    ? { background: palette.cream[50], color: palette.rust[700] }
    : TONES[phase];
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text variant="caption" style={[styles.label, { color: tone.color }]}>
        {MEETING_PHASE_LABELS[phase]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
  },
  label: { fontSize: 12, lineHeight: 18 },
});
