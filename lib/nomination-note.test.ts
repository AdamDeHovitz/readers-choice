import { describe, it, expect } from "vitest";
import {
  NOMINATION_NOTE_MAX_LENGTH,
  isNominationClosed,
  normalizeNominationNote,
} from "./nomination-note";

describe("normalizeNominationNote", () => {
  it("maps missing or blank notes to null", () => {
    expect(normalizeNominationNote(undefined)).toBeNull();
    expect(normalizeNominationNote(null)).toBeNull();
    expect(normalizeNominationNote("   \n\t ")).toBeNull();
  });

  it("trims surrounding whitespace but keeps inner line breaks", () => {
    expect(normalizeNominationNote("  Sourdough.\n\nAlso bread.  ")).toBe(
      "Sourdough.\n\nAlso bread."
    );
  });

  it("accepts notes at the limit and rejects longer ones", () => {
    const atLimit = "a".repeat(NOMINATION_NOTE_MAX_LENGTH);
    expect(normalizeNominationNote(atLimit)).toBe(atLimit);
    expect(() => normalizeNominationNote(atLimit + "a")).toThrow(
      /500 characters/
    );
  });
});

describe("isNominationClosed", () => {
  const now = new Date("2026-10-07T12:00:00Z");

  it("is closed once the meeting is finalized", () => {
    expect(
      isNominationClosed({ is_finalized: true, nomination_deadline: null }, now)
    ).toBe(true);
  });

  it("stays open without a deadline", () => {
    expect(
      isNominationClosed(
        { is_finalized: false, nomination_deadline: null },
        now
      )
    ).toBe(false);
  });

  it("is open up to and including the deadline instant", () => {
    const meeting = {
      is_finalized: false,
      nomination_deadline: now.toISOString(),
    };
    expect(isNominationClosed(meeting, now)).toBe(false);
    expect(isNominationClosed(meeting, new Date(now.getTime() + 1))).toBe(true);
  });
});
