import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEETING_TIME,
  suggestMeetingSchedule,
  type PastMeetingSchedule,
} from "./meeting-defaults";

/** Local time → ISO, the way the database returns timestamps. */
const at = (y: number, m: number, d: number, h = 19, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const meeting = (
  meetingDate: string,
  nominationDeadline: string | null = null,
  votingDeadline: string | null = null
): PastMeetingSchedule => ({ meetingDate, nominationDeadline, votingDeadline });

describe("suggestMeetingSchedule", () => {
  const now = new Date(2026, 10, 10, 12); // Tue Nov 10 2026, noon

  it("suggests only a time for a club's first meeting", () => {
    expect(suggestMeetingSchedule([], now)).toEqual({
      meetingDate: "",
      nominationDeadline: "",
      votingDeadline: "",
      meetingTime: DEFAULT_MEETING_TIME,
    });
  });

  it("reuses the last meeting's time when there's no cadence yet", () => {
    const result = suggestMeetingSchedule(
      [meeting(at(2026, 11, 3, 18, 30))],
      now
    );
    expect(result.meetingDate).toBe("");
    expect(result.meetingTime).toBe("18:30");
  });

  it("continues the cadence after the latest meeting", () => {
    const result = suggestMeetingSchedule(
      [meeting(at(2026, 11, 17)), meeting(at(2026, 10, 20))],
      now
    );
    expect(result.meetingDate).toBe("2026-12-15T19:00");
  });

  it("skips cadence dates that have already passed", () => {
    // Meetings every 2 weeks, last one Oct 6: Oct 20 and Nov 3 are past.
    const result = suggestMeetingSchedule(
      [meeting(at(2026, 10, 6)), meeting(at(2026, 9, 22))],
      now
    );
    expect(result.meetingDate).toBe("2026-11-17T19:00");
  });

  it("keeps deadlines the same days before the meeting, at the same time", () => {
    const result = suggestMeetingSchedule(
      [
        meeting(
          at(2026, 11, 3),
          at(2026, 10, 9, 23, 59), // Friday after the previous meeting
          at(2026, 10, 12, 21) // Monday after that
        ),
        meeting(at(2026, 10, 6)),
      ],
      new Date(2026, 10, 4, 9) // the morning after the latest meeting
    );
    expect(result).toMatchObject({
      meetingDate: "2026-12-01T19:00",
      nominationDeadline: "2026-11-06T23:59",
      votingDeadline: "2026-11-09T21:00",
    });
  });

  it("drops a suggested deadline that has already passed", () => {
    const result = suggestMeetingSchedule(
      [
        meeting(at(2026, 11, 3), at(2026, 10, 1), at(2026, 11, 1)),
        meeting(at(2026, 10, 6)),
      ],
      now
    );
    expect(result.nominationDeadline).toBe("");
    expect(result.votingDeadline).toBe("2026-11-29T19:00");
  });

  it("ignores gaps that don't look like a cadence", () => {
    const result = suggestMeetingSchedule(
      [meeting(at(2026, 11, 3)), meeting(at(2026, 1, 3))],
      now
    );
    expect(result.meetingDate).toBe("");
    expect(result.meetingTime).toBe("19:00");
  });
});
