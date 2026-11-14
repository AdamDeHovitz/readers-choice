import { Badge } from "@/components/ui/badge";
import {
  getMeetingPhase,
  MEETING_PHASE_LABELS,
  type MeetingPhase,
  type MeetingSchedule,
} from "@readers-choice/core/meeting-schedule";

const VARIANTS = {
  nominating: "active",
  voting: "active",
  awaiting_finalization: "default",
  finalized: "primary",
} as const satisfies Record<MeetingPhase, string>;

/** A meeting's phase, as decided by packages/core/meeting-schedule. */
export function MeetingStatusBadge({
  meeting,
  className,
}: {
  meeting: MeetingSchedule;
  className?: string;
}) {
  const phase = getMeetingPhase(meeting);
  return (
    <Badge variant={VARIANTS[phase]} className={className}>
      {MEETING_PHASE_LABELS[phase]}
    </Badge>
  );
}
