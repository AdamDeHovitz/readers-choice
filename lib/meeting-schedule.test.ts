import { describe, expect, it } from "vitest";
import {
  getClubStatus,
  getMeetingPhase,
  isNominationClosed,
  isVotingClosed,
  pickFeaturedMeeting,
  pickUpcomingMeeting,
} from "./meeting-schedule";

const now = new Date("2026-05-01T12:00:00Z");
const before = "2026-05-01T11:59:59Z";
const at = now.toISOString();
const after = "2026-05-02T12:00:00Z";

describe("isNominationClosed", () => {
  it("is closed once the meeting is finalized", () => {
    expect(
      isNominationClosed({ isFinalized: true, nominationDeadline: null }, now)
    ).toBe(true);
  });

  it("stays open without a deadline", () => {
    expect(
      isNominationClosed({ isFinalized: false, nominationDeadline: null }, now)
    ).toBe(false);
  });

  it("is open up to and including the deadline instant", () => {
    const meeting = { isFinalized: false, nominationDeadline: at };
    expect(isNominationClosed(meeting, now)).toBe(false);
    expect(isNominationClosed(meeting, new Date(now.getTime() + 1))).toBe(true);
  });
});

describe("isVotingClosed", () => {
  it("is closed once finalized", () => {
    expect(
      isVotingClosed({ isFinalized: true, votingDeadline: null }, now)
    ).toBe(true);
  });

  it("is open with no deadline", () => {
    expect(
      isVotingClosed({ isFinalized: false, votingDeadline: null }, now)
    ).toBe(false);
  });

  it("is open up to and including the deadline, closed after", () => {
    expect(
      isVotingClosed({ isFinalized: false, votingDeadline: at }, now)
    ).toBe(false);
    expect(
      isVotingClosed({ isFinalized: false, votingDeadline: before }, now)
    ).toBe(true);
  });
});

describe("getMeetingPhase", () => {
  const phase = (
    nominationDeadline: string | null,
    votingDeadline: string | null,
    isFinalized = false
  ) =>
    getMeetingPhase({ isFinalized, nominationDeadline, votingDeadline }, now);

  it("is finalized regardless of deadlines", () => {
    expect(phase(after, after, true)).toBe("finalized");
    expect(phase(before, before, true)).toBe("finalized");
  });

  it("is nominating until the nomination deadline, or forever without one", () => {
    expect(phase(after, after)).toBe("nominating");
    expect(phase(at, after)).toBe("nominating");
    expect(phase(null, null)).toBe("nominating");
    expect(phase(null, before)).toBe("nominating");
  });

  it("is voting after nominations close until the voting deadline", () => {
    expect(phase(before, after)).toBe("voting");
    expect(phase(before, at)).toBe("voting");
    expect(phase(before, null)).toBe("voting");
  });

  it("awaits finalization once both deadlines have passed", () => {
    expect(phase(before, before)).toBe("awaiting_finalization");
  });
});

describe("pickFeaturedMeeting", () => {
  const meeting = (id: string, meetingDate: string, isFinalized = true) => ({
    id,
    meetingDate,
    isFinalized,
  });

  it("returns null without finalized meetings", () => {
    expect(pickFeaturedMeeting([], now)).toBeNull();
    expect(pickFeaturedMeeting([meeting("a", after, false)], now)).toBeNull();
  });

  it("prefers the soonest upcoming finalized meeting", () => {
    const result = pickFeaturedMeeting(
      [
        meeting("past", "2026-04-01T00:00:00Z"),
        meeting("later", "2026-07-01T00:00:00Z"),
        meeting("sooner", "2026-06-01T00:00:00Z"),
        meeting("unfinalized", "2026-05-15T00:00:00Z", false),
      ],
      now
    );
    expect(result).toEqual({
      meeting: expect.objectContaining({ id: "sooner" }),
      label: "Upcoming",
    });
  });

  it("falls back to the most recent past finalized meeting", () => {
    const result = pickFeaturedMeeting(
      [
        meeting("older", "2026-01-01T00:00:00Z"),
        meeting("recent", "2026-04-01T00:00:00Z"),
      ],
      now
    );
    expect(result).toEqual({
      meeting: expect.objectContaining({ id: "recent" }),
      label: "Previous Book",
    });
  });
});

describe("pickUpcomingMeeting", () => {
  const meeting = (id: string, meetingDate: string, isFinalized = false) => ({
    id,
    meetingDate,
    isFinalized,
  });

  it("picks the soonest unfinalized meeting from now on", () => {
    expect(
      pickUpcomingMeeting(
        [
          meeting("past", before),
          meeting("later", "2026-07-01T00:00:00Z"),
          meeting("finalized", after, true),
          meeting("sooner", after),
        ],
        now
      )?.id
    ).toBe("sooner");
  });

  it("includes a meeting happening right now", () => {
    expect(pickUpcomingMeeting([meeting("now", at)], now)?.id).toBe("now");
  });

  it("returns null when nothing is upcoming", () => {
    expect(pickUpcomingMeeting([meeting("past", before)], now)).toBeNull();
  });
});

describe("getClubStatus", () => {
  it("is inactive without an upcoming meeting", () => {
    expect(getClubStatus(null, now)).toBe("inactive");
  });

  it("is nominating, then voting, and stays voting until finalized", () => {
    const status = (
      nominationDeadline: string | null,
      votingDeadline: string | null
    ) =>
      getClubStatus(
        { isFinalized: false, nominationDeadline, votingDeadline },
        now
      );
    expect(status(after, after)).toBe("nominating");
    expect(status(before, after)).toBe("voting");
    expect(status(before, before)).toBe("voting");
  });
});
