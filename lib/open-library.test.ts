import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchBooks } from "./open-library";

describe("searchBooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should find 'The Art of Fielding' when searching by title", async () => {
    const results = await searchBooks("the art of fielding");

    expect(results.length).toBeGreaterThan(0);

    // The first result should be "The Art of Fielding" by Chad Harbach
    const artOfFielding = results.find(
      (book) =>
        book.title.toLowerCase().includes("art of fielding") &&
        book.author.toLowerCase().includes("harbach")
    );
    expect(artOfFielding).toBeDefined();
    expect(artOfFielding?.title.toLowerCase()).toContain("art of fielding");
    expect(artOfFielding?.author.toLowerCase()).toContain("harbach");
  });

  it("should not return unrelated books like 'Wizard of Oz' for 'art of fielding' search", async () => {
    const results = await searchBooks("the art of fielding");

    // Should NOT return books that just happen to have common words like "the" or "of"
    const wizardOfOz = results.find((book) =>
      book.title.toLowerCase().includes("wizard of oz")
    );
    expect(wizardOfOz).toBeUndefined();

    const napoleonOfNottingHill = results.find((book) =>
      book.title.toLowerCase().includes("napoleon of notting hill")
    );
    expect(napoleonOfNottingHill).toBeUndefined();
  });

  it("should deduplicate results with the same work ID", async () => {
    const results = await searchBooks("the art of fielding");

    // Check that we don't have duplicate work IDs
    const workIds = results.map((book) => book.id);
    const uniqueWorkIds = new Set(workIds);
    expect(workIds.length).toBe(uniqueWorkIds.size);
  });

  it("should return at most 5 results", async () => {
    const results = await searchBooks("harry potter");
    expect(results.length).toBeLessThanOrEqual(5);
  }, 10000);

  it("should return empty array for empty query", async () => {
    const results = await searchBooks("");
    expect(results).toEqual([]);
  });

  it("should find 'To Kill a Mockingbird' when searching for it", async () => {
    const results = await searchBooks("to kill a mockingbird");

    expect(results.length).toBeGreaterThan(0);

    const mockingbird = results.find(
      (book) =>
        book.title.toLowerCase().includes("mockingbird") &&
        book.author.toLowerCase().includes("lee")
    );
    expect(mockingbird).toBeDefined();
  });

  it("should find '1984' when searching for it", async () => {
    const results = await searchBooks("1984");

    expect(results.length).toBeGreaterThan(0);

    // Should find Orwell's 1984 in the results
    const book1984 = results.find(
      (book) =>
        book.title.includes("1984") &&
        book.author.toLowerCase().includes("orwell")
    );
    expect(book1984).toBeDefined();
  });
});
