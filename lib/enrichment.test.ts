import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BookSearchResult as GoogleResult } from "./google-books";
import type { BookSearchResult } from "./open-library";

const searchBooks = vi.hoisted(() =>
  vi.fn<(query: string) => Promise<GoogleResult[]>>()
);
vi.mock("./google-books", () => ({ searchBooks }));

import { enrichBookDescription } from "./enrichment";

function openLibraryBook(
  overrides: Partial<BookSearchResult> = {}
): BookSearchResult {
  return {
    id: "OL1W",
    title: "The Art of Fielding",
    author: "Chad Harbach",
    externalId: "OL1W",
    externalSource: "open_library",
    ...overrides,
  };
}

function googleResult(overrides: Partial<GoogleResult> = {}): GoogleResult {
  return {
    id: "g1",
    title: "The Art of Fielding",
    author: "Chad Harbach",
    externalId: "g1",
    externalSource: "google_books",
    ...overrides,
  };
}

describe("enrichBookDescription", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    searchBooks.mockReset();
    vi.restoreAllMocks();
  });

  it("uses the ISBN lookup first when it has a description", async () => {
    searchBooks.mockResolvedValueOnce([
      googleResult({ description: "From ISBN" }),
    ]);

    const result = await enrichBookDescription(
      openLibraryBook({ isbn: "9780316126694" })
    );

    expect(result).toBe("From ISBN");
    expect(searchBooks).toHaveBeenCalledTimes(1);
    expect(searchBooks).toHaveBeenCalledWith("isbn:9780316126694");
  });

  it("falls back to title + author when the ISBN result has no description", async () => {
    searchBooks
      .mockResolvedValueOnce([googleResult()])
      .mockResolvedValueOnce([googleResult({ description: "From title" })]);

    const result = await enrichBookDescription(
      openLibraryBook({ isbn: "9780316126694" })
    );

    expect(result).toBe("From title");
    expect(searchBooks).toHaveBeenNthCalledWith(
      2,
      "intitle:The Art of Fielding inauthor:Chad Harbach"
    );
  });

  it("skips the ISBN lookup when there is no ISBN", async () => {
    searchBooks.mockResolvedValueOnce([
      googleResult({ description: "From title" }),
    ]);

    expect(await enrichBookDescription(openLibraryBook())).toBe("From title");
    expect(searchBooks).toHaveBeenCalledTimes(1);
  });

  it("strips subtitles, parentheticals and extra authors from the query", async () => {
    searchBooks.mockResolvedValueOnce([]);

    await enrichBookDescription(
      openLibraryBook({
        title: "Dune: Deluxe Edition (Book 1)",
        author: "Frank Herbert, Someone Else",
      })
    );

    expect(searchBooks).toHaveBeenCalledWith(
      "intitle:Dune inauthor:Frank Herbert"
    );
  });

  it("prefers the result whose title matches over the first result", async () => {
    searchBooks.mockResolvedValueOnce([
      googleResult({ title: "Study Guide", description: "Wrong book" }),
      googleResult({
        title: "The Art of Fielding: A Novel",
        description: "Right book",
      }),
    ]);

    expect(await enrichBookDescription(openLibraryBook())).toBe("Right book");
  });

  it("uses the first result when no title matches", async () => {
    searchBooks.mockResolvedValueOnce([
      googleResult({ title: "Something", description: "First" }),
      googleResult({ title: "Else", description: "Second" }),
    ]);

    expect(await enrichBookDescription(openLibraryBook())).toBe("First");
  });

  it("returns null when nothing has a description", async () => {
    searchBooks.mockResolvedValue([]);
    expect(
      await enrichBookDescription(openLibraryBook({ isbn: "1" }))
    ).toBeNull();
    expect(searchBooks).toHaveBeenCalledTimes(2);
  });

  it("returns null instead of throwing when the search fails", async () => {
    searchBooks.mockRejectedValue(new Error("boom"));
    expect(
      await enrichBookDescription(openLibraryBook({ isbn: "1" }))
    ).toBeNull();
  });
});
