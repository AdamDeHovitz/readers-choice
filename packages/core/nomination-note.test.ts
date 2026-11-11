import { describe, it, expect } from "vitest";
import {
  NOMINATION_NOTE_MAX_LENGTH,
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
