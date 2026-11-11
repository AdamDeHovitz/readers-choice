import { describe, expect, it } from "vitest";
import {
  buildClubCalendar,
  calendarSubscribeLinks,
  feedHistoryStart,
  meetingEvent,
  type CalendarMeeting,
} from "./club-calendar";

const base: CalendarMeeting = {
  id: "m1",
  meetingDate: "2026-11-10T19:00:00Z",
  updatedAt: "2026-11-01T08:00:00Z",
  isFinalized: true,
  details: "  At Alice's place  ",
  themeName: "Sci-fi",
  book: { title: "Dune", author: "Frank Herbert" },
};

describe("meetingEvent", () => {
  it("maps a finalized meeting to a two-hour event", () => {
    const event = meetingEvent("Seed Club", base, "https://rc.example");
    expect(event.uid).toBe("meeting-m1@readers-choice");
    expect(event.start.toISOString()).toBe("2026-11-10T19:00:00.000Z");
    expect(event.end.toISOString()).toBe("2026-11-10T21:00:00.000Z");
    expect(event.summary).toBe("Seed Club: Dune");
    expect(event.url).toBe("https://rc.example/meetings/m1");
    expect(event.description).toBe(
      "Dune by Frank Herbert\n\nTheme: Sci-fi\n\nAt Alice's place\n\nhttps://rc.example/meetings/m1"
    );
    expect(event.lastModified?.toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("marks a meeting without a book as TBD", () => {
    const event = meetingEvent(
      "Seed Club",
      {
        ...base,
        isFinalized: false,
        book: null,
        themeName: null,
        details: null,
        updatedAt: null,
      },
      "https://rc.example"
    );
    expect(event.summary).toBe("Seed Club (book TBD)");
    expect(event.description).toBe(
      "The book hasn't been picked yet.\n\nhttps://rc.example/meetings/m1"
    );
    expect(event.lastModified).toBeUndefined();
  });

  it("omits a missing author", () => {
    const event = meetingEvent(
      "C",
      { ...base, book: { title: "Beowulf", author: null } },
      "https://rc.example"
    );
    expect(event.description?.startsWith("Beowulf\n\n")).toBe(true);
  });
});

describe("buildClubCalendar", () => {
  it("names the calendar after the club and includes every meeting", () => {
    const ics = buildClubCalendar({
      clubName: "Seed Club",
      meetings: [base, { ...base, id: "m2" }],
      baseUrl: "https://rc.example",
    });
    expect(ics).toContain("X-WR-CALNAME:Seed Club");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});

describe("feedHistoryStart", () => {
  it("goes back 180 days", () => {
    expect(
      feedHistoryStart(new Date("2026-11-10T00:00:00Z")).toISOString()
    ).toBe("2026-05-14T00:00:00.000Z");
  });
});

describe("calendarSubscribeLinks", () => {
  it("builds webcal and Google subscribe links", () => {
    const links = calendarSubscribeLinks(
      "https://rc.example/api/calendar/t.ics"
    );
    expect(links.webcal).toBe("webcal://rc.example/api/calendar/t.ics");
    expect(links.google).toBe(
      "https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Frc.example%2Fapi%2Fcalendar%2Ft.ics"
    );
  });
});
