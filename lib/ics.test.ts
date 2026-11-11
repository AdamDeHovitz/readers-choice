import { describe, expect, it } from "vitest";
import {
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
} from "./ics";

describe("formatIcsDate", () => {
  it("formats in UTC basic format without milliseconds", () => {
    expect(formatIcsDate(new Date("2026-11-10T19:05:09.123Z"))).toBe(
      "20261110T190509Z"
    );
  });
});

describe("escapeIcsText", () => {
  it("escapes backslashes, separators and newlines", () => {
    expect(escapeIcsText("a\\b; c, d\r\ne\nf")).toBe(
      "a\\\\b\\; c\\, d\\ne\\nf"
    );
  });
});

describe("foldIcsLine", () => {
  const octets = (s: string) => new TextEncoder().encode(s).length;

  it("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:Hi")).toBe("SUMMARY:Hi");
  });

  it("folds at 75 octets with space-prefixed continuations", () => {
    const line = "DESCRIPTION:" + "x".repeat(200);
    const parts = foldIcsLine(line).split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(octets(part)).toBeLessThanOrEqual(75);
    for (const part of parts.slice(1)) expect(part[0]).toBe(" ");
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });

  it("never splits a multi-byte character", () => {
    const line = "SUMMARY:" + "é📚".repeat(60);
    const parts = foldIcsLine(line).split("\r\n");
    for (const part of parts) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain("�");
    }
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});

describe("buildIcsCalendar", () => {
  const ics = buildIcsCalendar({
    name: "Seed Club, NYC",
    refreshIntervalHours: 6,
    now: new Date("2026-11-01T00:00:00Z"),
    events: [
      {
        uid: "meeting-1@readers-choice",
        start: new Date("2026-11-10T19:00:00Z"),
        end: new Date("2026-11-10T21:00:00Z"),
        summary: "Seed Club: Dune",
        description: "Line one\nLine two",
        url: "https://example.com/meetings/1",
        lastModified: new Date("2026-10-30T12:00:00Z"),
      },
    ],
  });
  const lines = ics.split("\r\n");

  it("uses CRLF line endings throughout", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("wraps events in a named calendar with refresh hints", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("X-WR-CALNAME:Seed Club\\, NYC");
    expect(lines).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("writes each event's fields", () => {
    expect(lines).toEqual(
      expect.arrayContaining([
        "BEGIN:VEVENT",
        "UID:meeting-1@readers-choice",
        "DTSTAMP:20261101T000000Z",
        "DTSTART:20261110T190000Z",
        "DTEND:20261110T210000Z",
        "SUMMARY:Seed Club: Dune",
        "DESCRIPTION:Line one\\nLine two",
        "URL:https://example.com/meetings/1",
        "LAST-MODIFIED:20261030T120000Z",
        "END:VEVENT",
      ])
    );
  });

  it("omits optional fields", () => {
    const bare = buildIcsCalendar({
      name: "C",
      refreshIntervalHours: 1,
      events: [
        {
          uid: "u",
          start: new Date(0),
          end: new Date(0),
          summary: "S",
        },
      ],
    });
    expect(bare).not.toMatch(/DESCRIPTION|URL:|LAST-MODIFIED/);
  });
});
