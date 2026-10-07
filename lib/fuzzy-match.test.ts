import { describe, it, expect } from "vitest";
import { areThemesFuzzyMatch, findFuzzyMatch } from "./fuzzy-match";

describe("areThemesFuzzyMatch", () => {
  describe("matches", () => {
    it.each([
      ["Mystery", "Mystery"],
      ["mystery", "MYSTERY"],
      ["  Science   Fiction ", "science fiction"],
    ])("treats %j and %j as the same (case/whitespace)", (a, b) => {
      expect(areThemesFuzzyMatch(a, b)).toBe(true);
    });

    it.each([
      ["Mystery", "Mysteries"],
      ["Fantasy", "Fantasies"],
      ["Ghost Story", "Ghost Stories"],
      ["Memoir", "Memoirs"],
      ["Classic", "Classics"],
      ["Art", "Arts"],
      ["Class", "Classes"],
      ["Thriller", "Thrillers"],
    ])("matches plural forms %j / %j", (a, b) => {
      expect(areThemesFuzzyMatch(a, b)).toBe(true);
      expect(areThemesFuzzyMatch(b, a)).toBe(true);
    });

    it.each([
      ["Romance", "Romanse"], // 1 typo, 7 chars
      ["Romance", "Rommance"], // 1 insertion
      ["Dystopia", "Dystopian"], // 1 edit, 8 chars
      ["Historical", "Histroical"], // transposition (2 edits), 10 chars
      ["Science Fiction", "Sceince Ficton"], // 3 edits, 14+ chars
      ["Magical Realism", "Magical Realsim"],
      ["Coming of Age", "Comming of Age"],
    ])("tolerates small typos in longer names: %j / %j", (a, b) => {
      expect(areThemesFuzzyMatch(a, b)).toBe(true);
      expect(areThemesFuzzyMatch(b, a)).toBe(true);
    });
  });

  describe("non-matches", () => {
    it.each([
      ["Love", "Loss"],
      ["Cat", "Dog"],
      ["Art", "War"],
      ["Horror", "Humor"],
      ["History", "Mystery"],
      ["War", "Wars of the Roses"],
      ["Art", "Party"],
      ["Love", "Lovers"],
      ["Poetry", "Poetic"],
      ["Fiction", "Nonfiction"],
      ["Biography", "Autobiography"],
      ["Science Fiction", "Social Fiction"],
    ])("does not match distinct themes %j / %j", (a, b) => {
      expect(areThemesFuzzyMatch(a, b)).toBe(false);
      expect(areThemesFuzzyMatch(b, a)).toBe(false);
    });

    it("does not let one-letter edits merge short words", () => {
      expect(areThemesFuzzyMatch("Sea", "Tea")).toBe(false);
      expect(areThemesFuzzyMatch("Cats", "Bats")).toBe(false);
    });

    it("does not treat empty strings as matching real themes", () => {
      expect(areThemesFuzzyMatch("", "Art")).toBe(false);
      expect(areThemesFuzzyMatch("   ", "Mystery")).toBe(false);
    });
  });
});

describe("findFuzzyMatch", () => {
  const themes = [
    { id: "1", name: "Mysteries" },
    { id: "2", name: "Mystery" },
    { id: "3", name: "Love" },
    { id: "4", name: "Science Fiction" },
  ];

  it("prefers an exact match over an earlier fuzzy match", () => {
    expect(findFuzzyMatch("mystery", themes)).toEqual({
      id: "2",
      name: "Mystery",
    });
  });

  it("returns a fuzzy match when there is no exact one", () => {
    expect(findFuzzyMatch("Science Fictoin", themes)?.id).toBe("4");
  });

  it("returns null when nothing is close", () => {
    expect(findFuzzyMatch("Loss", themes)).toBeNull();
    expect(findFuzzyMatch("Horror", themes)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(findFuzzyMatch("Mystery", [])).toBeNull();
  });
});
