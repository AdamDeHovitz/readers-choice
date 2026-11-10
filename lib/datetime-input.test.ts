import { describe, expect, it } from "vitest";
import { fromDateTimeInput, toDateTimeInput } from "./datetime-input";

describe("datetime-local conversions", () => {
  it("round-trips through local time", () => {
    const iso = new Date(2026, 4, 1, 19, 30).toISOString();
    expect(toDateTimeInput(iso)).toBe("2026-05-01T19:30");
    expect(fromDateTimeInput("2026-05-01T19:30")).toBe(iso);
  });

  it("maps blank input to null", () => {
    expect(fromDateTimeInput("")).toBeNull();
    expect(fromDateTimeInput(null)).toBeNull();
  });
});
