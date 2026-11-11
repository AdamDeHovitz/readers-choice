import { describe, expect, it } from "vitest";
import {
  END_OF_DAY,
  TIME_SLOTS,
  formatTimeOfDay,
  fromDateTimeInput,
  joinDateTimeInput,
  parseDateInput,
  splitDateTimeInput,
  toDateInput,
  toDateTimeInput,
} from "./datetime-input";

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

describe("date and time parts", () => {
  it("splits and joins", () => {
    expect(splitDateTimeInput("2026-05-01T19:30")).toEqual({
      date: "2026-05-01",
      time: "19:30",
    });
    expect(splitDateTimeInput("")).toEqual({ date: "", time: "" });
    expect(joinDateTimeInput("2026-05-01", "19:30")).toBe("2026-05-01T19:30");
    expect(joinDateTimeInput("", "19:30")).toBe("");
  });

  it("parses a date input as local midnight", () => {
    expect(toDateInput(parseDateInput("2026-03-08"))).toBe("2026-03-08");
    expect(parseDateInput("2026-03-08").getHours()).toBe(0);
  });

  it("offers quarter-hour slots and end of day", () => {
    expect(TIME_SLOTS).toHaveLength(97);
    expect(TIME_SLOTS.slice(0, 3)).toEqual(["00:00", "00:15", "00:30"]);
    expect(TIME_SLOTS.at(-1)).toBe(END_OF_DAY);
  });

  it("formats a time of day for the locale", () => {
    expect(formatTimeOfDay("19:00", "en-US")).toBe("7:00 PM");
    expect(formatTimeOfDay("19:00", "en-GB")).toBe("19:00");
  });
});
