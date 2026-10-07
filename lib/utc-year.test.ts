import { describe, it, expect } from "vitest";
import { getUtcYear, getUtcYearRange } from "./utc-year";

describe("utc-year", () => {
  it("covers the whole UTC year as a half-open range", () => {
    expect(getUtcYearRange(2025)).toEqual({
      start: "2025-01-01T00:00:00.000Z",
      end: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads the year in UTC regardless of offset", () => {
    expect(getUtcYear("2025-12-31T23:30:00-05:00")).toBe(2026);
    expect(getUtcYear("2026-01-01T00:30:00+02:00")).toBe(2025);
  });
});
