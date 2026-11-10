import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findGoogleBooksDescription, searchVolumes } from "./google-books";

type Item = { title: string; description?: string };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const fetchMock = vi.fn<typeof fetch>();

/** Answer each request with the next list of volumes. */
function respondWith(...pages: Item[][]) {
  for (const items of pages) {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: items.map((volumeInfo) => ({ volumeInfo })) })
    );
  }
}

const queries = () =>
  fetchMock.mock.calls.map(([url]) =>
    new URL(String(url)).searchParams.get("q")
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchVolumes", () => {
  it("queries the volumes endpoint, dropping blank descriptions", async () => {
    respondWith([
      { title: "One", description: "<p>Hello</p>" },
      { title: "Two", description: "   " },
    ]);

    const results = await searchVolumes("isbn:123");

    expect(results).toEqual([
      { title: "One", description: "<p>Hello</p>" },
      { title: "Two", description: undefined },
    ]);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      "https://www.googleapis.com/books/v1/volumes"
    );
    expect(url.searchParams.get("maxResults")).toBe("10");
  });

  it("returns [] with no items, a non-ok response, or a network error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ totalItems: 0 }));
    expect(await searchVolumes("q")).toEqual([]);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "quota" }, { status: 429, statusText: "Too Many" })
    );
    expect(await searchVolumes("q")).toEqual([]);

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await searchVolumes("q")).toEqual([]);
  });
});

describe("findGoogleBooksDescription", () => {
  const book = { title: "The Art of Fielding", author: "Chad Harbach" };

  it("uses the ISBN lookup first when it has a description", async () => {
    respondWith([{ title: book.title, description: "From ISBN" }]);

    expect(
      await findGoogleBooksDescription({ ...book, isbn: "9780316126694" })
    ).toBe("From ISBN");
    expect(queries()).toEqual(["isbn:9780316126694"]);
  });

  it("falls back to title + author when the ISBN result has no description", async () => {
    respondWith(
      [{ title: book.title }],
      [{ title: book.title, description: "From title" }]
    );

    expect(await findGoogleBooksDescription({ ...book, isbn: "1" })).toBe(
      "From title"
    );
    expect(queries()[1]).toBe(
      "intitle:The Art of Fielding inauthor:Chad Harbach"
    );
  });

  it("skips the ISBN lookup when there is no ISBN", async () => {
    respondWith([{ title: book.title, description: "From title" }]);
    expect(await findGoogleBooksDescription(book)).toBe("From title");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("strips subtitles, parentheticals and extra authors from the query", async () => {
    respondWith([]);
    await findGoogleBooksDescription({
      title: "Dune: Deluxe Edition (Book 1)",
      author: "Frank Herbert, Someone Else",
    });
    expect(queries()).toEqual(["intitle:Dune inauthor:Frank Herbert"]);
  });

  it("prefers the result whose title matches, else the first", async () => {
    respondWith([
      { title: "Study Guide", description: "Wrong book" },
      { title: "The Art of Fielding: A Novel", description: "Right book" },
    ]);
    expect(await findGoogleBooksDescription(book)).toBe("Right book");

    respondWith([
      { title: "Something", description: "First" },
      { title: "Else", description: "Second" },
    ]);
    expect(await findGoogleBooksDescription(book)).toBe("First");
  });

  it("returns null when nothing has a description or the API fails", async () => {
    respondWith([], []);
    expect(await findGoogleBooksDescription({ ...book, isbn: "1" })).toBeNull();

    fetchMock.mockRejectedValue(new Error("boom"));
    expect(await findGoogleBooksDescription({ ...book, isbn: "1" })).toBeNull();
  });
});
