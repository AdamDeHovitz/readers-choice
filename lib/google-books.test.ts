import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatGoogleBook,
  getBookById,
  searchBooks,
  type GoogleBook,
} from "./google-books";
import { parseYear } from "./utils";

function makeBook(volumeInfo: Partial<GoogleBook["volumeInfo"]>): GoogleBook {
  return { id: "vol-1", volumeInfo: { title: "A Title", ...volumeInfo } };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("formatGoogleBook", () => {
  it("maps a complete volume", () => {
    const result = formatGoogleBook(
      makeBook({
        title: "The Art of Fielding",
        authors: ["Chad Harbach"],
        description: "<p>A â€œbaseballâ€\u009d novel</p>",
        publishedDate: "2011-09-07",
        pageCount: 512,
        imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0316126691" },
          { type: "ISBN_13", identifier: "9780316126694" },
        ],
      })
    );

    expect(result).toEqual({
      id: "vol-1",
      title: "The Art of Fielding",
      author: "Chad Harbach",
      coverUrl: "https://books.google.com/cover.jpg",
      description: '<p>A "baseball" novel</p>',
      publishedYear: 2011,
      pageCount: 512,
      isbn: "9780316126694",
      externalId: "vol-1",
      externalSource: "google_books",
    });
  });

  it("prefers ISBN-13 over ISBN-10 regardless of order", () => {
    const result = formatGoogleBook(
      makeBook({
        industryIdentifiers: [
          { type: "ISBN_13", identifier: "9780000000002" },
          { type: "ISBN_10", identifier: "0000000000" },
        ],
      })
    );
    expect(result.isbn).toBe("9780000000002");
  });

  it("falls back to ISBN-10, then to undefined", () => {
    expect(
      formatGoogleBook(
        makeBook({
          industryIdentifiers: [
            { type: "OTHER", identifier: "OCLC:1" },
            { type: "ISBN_10", identifier: "0000000000" },
          ],
        })
      ).isbn
    ).toBe("0000000000");
    expect(formatGoogleBook(makeBook({})).isbn).toBeUndefined();
  });

  it("joins multiple authors and defaults missing authors", () => {
    expect(formatGoogleBook(makeBook({ authors: ["A", "B"] })).author).toBe(
      "A, B"
    );
    expect(formatGoogleBook(makeBook({})).author).toBe("Unknown Author");
    expect(formatGoogleBook(makeBook({ authors: [] })).author).toBe(
      "Unknown Author"
    );
  });

  it("upgrades cover URLs to https and falls back to smallThumbnail", () => {
    expect(
      formatGoogleBook(
        makeBook({ imageLinks: { smallThumbnail: "http://x.test/small.jpg" } })
      ).coverUrl
    ).toBe("https://x.test/small.jpg");
    expect(
      formatGoogleBook(
        makeBook({
          imageLinks: {
            thumbnail: "https://x.test/thumb.jpg",
            smallThumbnail: "http://x.test/small.jpg",
          },
        })
      ).coverUrl
    ).toBe("https://x.test/thumb.jpg");
    expect(formatGoogleBook(makeBook({})).coverUrl).toBeUndefined();
  });

  it.each([
    ["2011", 2011],
    ["2011-09", 2011],
    ["2011-09-07", 2011],
    ["199?", undefined],
    ["", undefined],
    [undefined, undefined],
  ])("parses publishedDate %j as %j (never NaN)", (date, expected) => {
    const result = formatGoogleBook(makeBook({ publishedDate: date }));
    expect(result.publishedYear).toBe(expected);
  });

  it("omits an empty description", () => {
    expect(
      formatGoogleBook(makeBook({ description: "   " })).description
    ).toBeUndefined();
  });
});

describe("parseYear", () => {
  it.each([
    ["May 2, 2011", 2011],
    ["c1999", 1999],
    ["June 1960", 1960],
    ["12345", undefined],
    ["19", undefined],
    [null, undefined],
  ])("parses %j as %j", (value, expected) => {
    expect(parseYear(value)).toBe(expected);
  });
});

describe("searchBooks", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("queries the volumes endpoint and formats items", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          makeBook({ title: "One", authors: ["X"] }),
          { ...makeBook({ title: "Two" }), id: "vol-2" },
        ],
      })
    );

    const results = await searchBooks("isbn:123");

    expect(results.map((r) => r.title)).toEqual(["One", "Two"]);
    expect(results[1].id).toBe("vol-2");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      "https://www.googleapis.com/books/v1/volumes"
    );
    expect(url.searchParams.get("q")).toBe("isbn:123");
    expect(url.searchParams.get("maxResults")).toBe("10");
  });

  it("returns [] when the response has no items", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ totalItems: 0 }));
    expect(await searchBooks("nothing")).toEqual([]);

    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    expect(await searchBooks("nothing")).toEqual([]);
  });

  it("returns [] on a non-ok response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "quota" }, { status: 429, statusText: "Too Many" })
    );
    expect(await searchBooks("anything")).toEqual([]);
  });

  it("returns [] when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await searchBooks("anything")).toEqual([]);
  });
});

describe("getBookById", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches and formats a single volume", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeBook({ title: "Solo" })));
    const result = await getBookById("vol-1");
    expect(result?.title).toBe("Solo");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://www.googleapis.com/books/v1/volumes/vol-1"
    );
  });

  it("returns null on a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 404 }));
    expect(await getBookById("missing")).toBeNull();
  });
});
