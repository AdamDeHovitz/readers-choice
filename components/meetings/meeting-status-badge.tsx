import { Badge } from "@/components/ui/badge";
import { getMeetingPhase, type MeetingSchedule } from "@/lib/meeting-schedule";

const PHASES = {
  nominating: { label: "Nominations open", variant: "active" },
  voting: { label: "Voting open", variant: "active" },
  awaiting_finalization: { label: "Voting closed", variant: "default" },
  finalized: { label: "Finalized", variant: "primary" },
} as const;

/** A meeting's phase, as decided by lib/meeting-schedule. */
export function MeetingStatusBadge({
  meeting,
  className,
}: {
  meeting: MeetingSchedule;
  className?: string;
}) {
  const { label, variant } = PHASES[getMeetingPhase(meeting)];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
