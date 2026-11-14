import { describe, expect, it } from "vitest";
import { formatDate } from "./date-format";

describe("formatDate", () => {
  const iso = "2026-12-03T00:00:00Z";

  it("formats in the named style", () => {
    // The date-time separator ("," or " at") depends on the ICU version.
    expect(formatDate(iso, "meeting", "UTC")).toMatch(
      /^Thursday, December 3(,| at) 12:00 AM$/
    );
    expect(formatDate(iso, "deadline", "UTC")).toBe("Thu, Dec 3, 12:00 AM");
    expect(formatDate(iso, "date", "UTC")).toBe("December 3, 2026");
    expect(formatDate(iso, "shortMonth", "UTC")).toBe("Dec");
    expect(formatDate(iso, "day", "UTC")).toBe("3");
  });

  it("formats in the given time zone", () => {
    // 7pm on the 2nd in New York is midnight on the 3rd in UTC.
    expect(formatDate(iso, "meeting", "America/New_York")).toMatch(
      /^Wednesday, December 2(,| at) 7:00 PM$/
    );
  });
});
